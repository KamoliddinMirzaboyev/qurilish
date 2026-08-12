import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mineSchema, type MineInput } from "@buildscience/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { GalleryUploader } from "@/components/ui/GalleryUploader";
import { Button } from "@/components/ui/Button";
import { useCreateMine } from "@/features/mines/hooks";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

export default function AdminMineFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateMine();
  const [images, setImages] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MineInput>({ resolver: zodResolver(mineSchema) });

  async function onSubmit(values: MineInput) {
    try {
      const created = await createMutation.mutateAsync({ input: values, images });
      notify.success("Kon joylashtirildi.");
      navigate(`/mines/${created.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.errors) {
          for (const [field, messages] of Object.entries(err.errors)) {
            setError(field as keyof MineInput, { message: messages[0] });
          }
        }
        notify.error(err.message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Yangi kon joylashtirish" />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Kon nomi" required error={errors.name?.message} htmlFor="name">
            <Input id="name" placeholder="Masalan: Qibray Toshkoni" {...register("name")} />
          </FormField>

          <FormField label="Joylashuvi" required error={errors.location?.message} htmlFor="location">
            <Input id="location" placeholder="Viloyat, tuman" {...register("location")} />
          </FormField>

          <FormField label="Xomashyo turi" required error={errors.rawMaterialType?.message} htmlFor="rawMaterialType">
            <Input id="rawMaterialType" placeholder="Masalan: Ohaktosh" {...register("rawMaterialType")} />
          </FormField>

          <FormField label="Hajmi" required error={errors.volume?.message} htmlFor="volume">
            <Input id="volume" placeholder="Masalan: 500 000 m³" {...register("volume")} />
          </FormField>

          <FormField label="Tavsif" error={errors.description?.message} htmlFor="description">
            <Textarea id="description" className="min-h-[140px]" {...register("description")} />
          </FormField>

          <FormField label="Rasmlar">
            <GalleryUploader files={images} onChange={setImages} />
          </FormField>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Joylashtirish
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
