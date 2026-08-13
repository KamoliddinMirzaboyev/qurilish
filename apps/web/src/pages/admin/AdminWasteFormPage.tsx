import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Save, Ban, Factory, ImageIcon } from "lucide-react";
import { wasteSchema, GALLERY_UPLOAD, type WasteInput } from "@buildscience/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FormSkeleton } from "@/components/ui/Skeleton";
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WasteInput>({ resolver: zodResolver(wasteSchema) });

  const factoryName = watch("factoryName");

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
        navigate("/app/admin/waste");
      } else {
        await createMutation.mutateAsync({ input: values, images });
        notify.success("Chiqindi e'loni joylashtirildi.");
        navigate("/app/admin/waste");
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
    return <FormSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={isEdit ? "Chiqindi e'lonini tahrirlash" : "Yangi chiqindi e'loni"}
        subtitle="Zavod chiqindisi haqidagi asosiy ma'lumot va rasmlarni kiriting."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid items-start gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
            <Factory size={16} className="text-brand-primary" />
            Asosiy ma'lumot
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Zavod nomi" required error={errors.factoryName?.message} htmlFor="factoryName" className="sm:col-span-2">
              <Input id="factoryName" placeholder="Masalan: BetonStroy zavodi" {...register("factoryName")} />
            </FormField>

            <FormField label="Hajmi" required error={errors.volume?.message} htmlFor="volume">
              <Input id="volume" placeholder="40 tonna/oy" {...register("volume")} />
            </FormField>

            <FormField label="Yillik hajmi" required error={errors.annualVolume?.message} htmlFor="annualVolume">
              <Input id="annualVolume" placeholder="480 tonna/yil" {...register("annualVolume")} />
            </FormField>

            <FormField label="Tarkibi" required error={errors.composition?.message} htmlFor="composition" className="sm:col-span-2">
              <Textarea id="composition" className="min-h-[88px]" placeholder="Chiqindi tarkibi: beton qoldig'i, shlak..." {...register("composition")} />
            </FormField>

            <FormField label="Qo'shimcha ma'lumot" error={errors.description?.message} htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" className="min-h-[72px]" placeholder="Ixtiyoriy izoh" {...register("description")} />
            </FormField>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
            <ImageIcon size={16} className="text-brand-primary" />
            Rasmlar
          </div>
          <p className="mb-3 text-xs text-ink-muted">
            {factoryName?.trim() || "Zavod"} — JPG/PNG, 6 tagacha, har biri 10 MB gacha.
          </p>

          {isEdit && existing && (existing.images?.length ?? 0) > 0 && (
            <FormField label="Mavjud rasmlar" className="mb-4">
              <div className="grid grid-cols-3 gap-2">
                {(existing.images ?? []).map((img) => (
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

          <GalleryUploader
            files={images}
            onChange={setImages}
            max={GALLERY_UPLOAD.MAX_IMAGES - (existing?.images?.length ?? 0)}
          />
        </Card>

        <div className="flex justify-end gap-3 lg:col-span-5">
          <Button type="button" variant="outline" onClick={() => navigate("/app/admin/waste")}>
            <Ban size={16} /> Bekor qilish
          </Button>
          <Button type="submit" isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
            <Save size={16} /> {isEdit ? "Saqlash" : "Joylashtirish"}
          </Button>
        </div>
      </form>
    </div>
  );
}
