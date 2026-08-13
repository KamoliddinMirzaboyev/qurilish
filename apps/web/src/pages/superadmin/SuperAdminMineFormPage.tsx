import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { mineSchema, GALLERY_UPLOAD, type MineInput } from "@buildscience/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, LoadingSkeleton } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { GalleryUploader } from "@/components/ui/GalleryUploader";
import { IconButton, Button } from "@/components/ui/Button";
import { useMine, useCreateMine, useUpdateMine, useDeleteMineImage } from "@/features/mines/hooks";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

export default function SuperAdminMineFormPage() {
  const { mineId } = useParams();
  const isEdit = !!mineId;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useMine(mineId);
  const createMutation = useCreateMine();
  const updateMutation = useUpdateMine(mineId ?? "");
  const deleteImageMutation = useDeleteMineImage(mineId ?? "");
  const [images, setImages] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MineInput>({ resolver: zodResolver(mineSchema) });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        location: existing.location,
        rawMaterialType: existing.rawMaterialType,
        volume: existing.volume,
        description: existing.description ?? "",
      });
    }
  }, [existing, reset]);

  async function onSubmit(values: MineInput) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ input: values, images });
        notify.success("O'zgarishlar saqlandi.");
        navigate(`/mines/${mineId}`);
      } else {
        const created = await createMutation.mutateAsync({ input: values, images });
        notify.success("Kon joylashtirildi.");
        navigate(`/mines/${created.id}`);
      }
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

  async function removeExistingImage(imageId: string) {
    try {
      await deleteImageMutation.mutateAsync(imageId);
      notify.success("Rasm o'chirildi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    }
  }

  if (isEdit && isLoading) {
    return <LoadingSkeleton className="h-96 w-full" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={isEdit ? "Konni tahrirlash" : "Yangi kon joylashtirish"} />

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

          {isEdit && existing && existing.images.length > 0 && (
            <FormField label="Mavjud rasmlar">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {existing.images.map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-surface-border">
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <IconButton
                      label="Rasmni o'chirish"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute right-1 top-1 bg-white/90"
                    >
                      <X size={14} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </FormField>
          )}

          <FormField label={isEdit ? "Yangi rasmlar qo'shish" : "Rasmlar"}>
            <GalleryUploader
              files={images}
              onChange={setImages}
              max={GALLERY_UPLOAD.MAX_IMAGES - (existing?.images.length ?? 0)}
            />
          </FormField>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Saqlash" : "Joylashtirish"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
