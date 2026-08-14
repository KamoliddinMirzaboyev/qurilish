import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Save, Ban } from "lucide-react";
import { mineSchema, GALLERY_UPLOAD, type MineInput } from "@buildscience/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { GalleryUploader } from "@/components/ui/GalleryUploader";
import { MineMap } from "@/components/mines/MineMap";
import { IconButton, Button } from "@/components/ui/Button";
import { useMine, useCreateMine, useUpdateMine, useDeleteMineImage } from "@/features/mines/hooks";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { geocodeLocation } from "@/lib/geocode";

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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MineInput>({ resolver: zodResolver(mineSchema), defaultValues: { lat: null, lng: null } });
  const lat = watch("lat");
  const lng = watch("lng");
  const location = watch("location");
  const pickedRef = useRef(false);
  const geocodedForRef = useRef<string | null>(null); // location text the current lat/lng already matches

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        location: existing.location,
        lat: existing.lat ?? null,
        lng: existing.lng ?? null,
        rawMaterialType: existing.rawMaterialType,
        volume: existing.volume,
        description: existing.description ?? "",
      });
      pickedRef.current = existing.lat != null && existing.lng != null;
      geocodedForRef.current = existing.location;
    }
  }, [existing, reset]);

  useEffect(() => {
    if (!location || location.trim().length < 3) return;
    if (pickedRef.current && location === geocodedForRef.current) return;
    const timer = window.setTimeout(() => {
      void geocodeLocation(location).then((geo) => {
        if (!geo || pickedRef.current) return;
        setValue("lat", geo.lat, { shouldValidate: true });
        setValue("lng", geo.lng, { shouldValidate: true });
        geocodedForRef.current = location;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [location, setValue]);

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
    return <FormSkeleton />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title={isEdit ? "Konni tahrirlash" : "Yangi kon joylashtirish"} />

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Kon nomi" required error={errors.name?.message} htmlFor="name">
            <Input id="name" placeholder="Masalan: Qibray Toshkoni" {...register("name")} />
          </FormField>

          <FormField label="Joylashuvi" required error={errors.location?.message} htmlFor="location">
            <Input id="location" placeholder="Viloyat, tuman" {...register("location")} />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Xarita" error={errors.lat?.message ?? errors.lng?.message}>
              <p className="mb-2 text-xs text-ink-muted">Xaritani bosing — kon nuqtasi belgilanadi.</p>
              <div className="overflow-hidden rounded-lg border border-surface-border">
                <MineMap
                  markers={lat != null && lng != null ? [{ id: "pick", lat, lng, label: "Kon joyi" }] : []}
                  onPick={(nextLat, nextLng) => {
                    pickedRef.current = true;
                    geocodedForRef.current = location;
                    setValue("lat", nextLat, { shouldValidate: true });
                    setValue("lng", nextLng, { shouldValidate: true });
                  }}
                  className="h-72 w-full"
                />
              </div>
            </FormField>
          </div>

          <FormField label="Xomashyo turi" required error={errors.rawMaterialType?.message} htmlFor="rawMaterialType">
            <Input id="rawMaterialType" placeholder="Masalan: Ohaktosh" {...register("rawMaterialType")} />
          </FormField>

          <FormField label="Hajmi" required error={errors.volume?.message} htmlFor="volume">
            <Input id="volume" placeholder="Masalan: 500 000 m³" {...register("volume")} />
          </FormField>

          <div className="sm:col-span-2">
          <FormField label="Tavsif" error={errors.description?.message} htmlFor="description">
            <Textarea id="description" className="min-h-[100px]" {...register("description")} />
          </FormField>
          </div>

          {isEdit && existing && (existing.images?.length ?? 0) > 0 && (
            <FormField label="Mavjud rasmlar" className="sm:col-span-2">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
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

          <FormField label={isEdit ? "Yangi rasmlar qo'shish" : "Rasmlar"} className="sm:col-span-2">
            <GalleryUploader
              files={images}
              onChange={setImages}
              max={GALLERY_UPLOAD.MAX_IMAGES - (existing?.images?.length ?? 0)}
            />
          </FormField>

          <div className="mt-1 flex justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              <Ban size={16} /> Bekor qilish
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              <Save size={16} /> {isEdit ? "Saqlash" : "Joylashtirish"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
