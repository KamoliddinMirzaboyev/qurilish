import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { wasteSchema, type WasteInput } from "@buildscience/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { GalleryUploader } from "@/components/ui/GalleryUploader";
import { Button } from "@/components/ui/Button";
import { useCreateWaste } from "@/features/waste/hooks";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

export default function AdminWasteFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateWaste();
  const [images, setImages] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WasteInput>({ resolver: zodResolver(wasteSchema) });

  async function onSubmit(values: WasteInput) {
    try {
      const created = await createMutation.mutateAsync({ input: values, images });
      notify.success("Chiqindi e'loni joylashtirildi.");
      navigate(`/waste/${created.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.errors) {
          for (const [field, messages] of Object.entries(err.errors)) {
            setError(field as keyof WasteInput, { message: messages[0] });
          }
        }
        notify.error(err.message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Yangi chiqindi e'loni" />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Zavod nomi" required error={errors.factoryName?.message} htmlFor="factoryName">
            <Input id="factoryName" {...register("factoryName")} />
          </FormField>

          <FormField label="Tarkibi" required error={errors.composition?.message} htmlFor="composition">
            <Textarea id="composition" className="min-h-[100px]" {...register("composition")} />
          </FormField>

          <FormField label="Hajmi" required error={errors.volume?.message} htmlFor="volume">
            <Input id="volume" placeholder="Masalan: 40 tonna/oy" {...register("volume")} />
          </FormField>

          <FormField label="Yillik hajmi" required error={errors.annualVolume?.message} htmlFor="annualVolume">
            <Input id="annualVolume" placeholder="Masalan: 480 tonna/yil" {...register("annualVolume")} />
          </FormField>

          <FormField label="Qo'shimcha ma'lumot" error={errors.description?.message} htmlFor="description">
            <Textarea id="description" className="min-h-[100px]" {...register("description")} />
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
