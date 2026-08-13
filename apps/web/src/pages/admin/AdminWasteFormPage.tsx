import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { wasteSchema, GALLERY_UPLOAD, type WasteInput } from "@buildscience/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, LoadingSkeleton } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { GalleryUploader } from "@/components/ui/GalleryUploader";
import { IconButton, Button } from "@/components/ui/Button";
import { useWaste, useCreateWaste, useUpdateWaste, useDeleteWasteImage } from "@/features/waste/hooks";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

export default function AdminWasteFormPage() {
  const { wasteId } = useParams();
  const isEdit = !!wasteId;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useWaste(wasteId);
  const createMutation = useCreateWaste();
  const updateMutation = useUpdateWaste(wasteId ?? "");
  const deleteImageMutation = useDeleteWasteImage(wasteId ?? "");
  const [images, setImages] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WasteInput>({ resolver: zodResolver(wasteSchema) });

  useEffect(() => {
    if (existing) {
      reset({
        factoryName: existing.factoryName,
        composition: existing.composition,
        volume: existing.volume,
        annualVolume: existing.annualVolume,
        description: existing.description ?? "",
      });
    }
  }, [existing, reset]);

  async function onSubmit(values: WasteInput) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ input: values, images });
        notify.success("O'zgarishlar saqlandi.");
        navigate(`/waste/${wasteId}`);
      } else {
        const created = await createMutation.mutateAsync({ input: values, images });
        notify.success("Chiqindi e'loni joylashtirildi.");
        navigate(`/waste/${created.id}`);
      }
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
      <PageHeader title={isEdit ? "Chiqindi e'lonini tahrirlash" : "Yangi chiqindi e'loni"} />

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
