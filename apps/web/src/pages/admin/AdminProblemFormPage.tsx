import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import {
  createProblemSchema,
  CATEGORY_LABELS_UZ,
  BUDGET_TYPE_LABELS_UZ,
  GALLERY_UPLOAD,
  type CreateProblemInput,
} from "@buildscience/shared";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, LoadingSkeleton } from "@/components/ui/Card";
import { FormField, Input, Textarea, Select, RadioGroup, CurrencyInput } from "@/components/ui/Input";
import { GalleryUploader } from "@/components/ui/GalleryUploader";
import { IconButton, Button } from "@/components/ui/Button";
import { CategoryBadge } from "@/components/ui/Badge";
import { useProblem, useCreateProblem, useUpdateProblem, useDeleteProblemImage } from "@/features/problems/hooks";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/format";

const categoryOptions = Object.entries(CATEGORY_LABELS_UZ).map(([value, label]) => ({ value, label }));

export default function AdminProblemFormPage() {
  const { problemId } = useParams();
  const isEdit = !!problemId;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useProblem(problemId);
  const createMutation = useCreateProblem();
  const updateMutation = useUpdateProblem(problemId ?? "");
  const deleteImageMutation = useDeleteProblemImage(problemId ?? "");
  const [images, setImages] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProblemInput>({
    resolver: zodResolver(createProblemSchema),
    defaultValues: { budgetType: "FIXED", category: "CONSTRUCTION" },
  });

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        description: existing.description,
        category: existing.category,
        budgetType: existing.budgetType,
        budgetAmount: existing.budgetAmount ? Number(existing.budgetAmount) : undefined,
      });
    }
  }, [existing, reset]);

  const title = watch("title") ?? "";
  const description = watch("description") ?? "";
  const budgetType = watch("budgetType");
  const category = watch("category");
  const budgetAmount = watch("budgetAmount");

  async function onSubmit(values: CreateProblemInput) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ input: values, images });
        notify.success("O'zgarishlar saqlandi.");
        navigate(`/problems/${problemId}`);
      } else {
        const created = await createMutation.mutateAsync({ input: values, images });
        notify.success("Muammo joylashtirildi.");
        navigate(`/problems/${created.id}`);
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.errors) {
          for (const [field, messages] of Object.entries(err.errors)) {
            setError(field as keyof CreateProblemInput, { message: messages[0] });
          }
          notify.error(err.message);
          return;
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
      <PageHeader title={isEdit ? "Muammoni tahrirlash" : "Yangi muammo joylashtirish"} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField label="Muammo sarlavhasi" required error={errors.title?.message} htmlFor="title">
              <Input id="title" {...register("title")} />
              <p className="text-right text-xs text-ink-muted">{title.length} / 120</p>
            </FormField>

            <FormField label="Muammo tavsifi" required error={errors.description?.message} htmlFor="description">
              <Textarea id="description" className="min-h-[220px]" {...register("description")} />
              <p className="text-right text-xs text-ink-muted">{description.length} / 5000</p>
            </FormField>

            <FormField label="Yo'nalish" required error={errors.category?.message} htmlFor="category">
              <Select id="category" options={categoryOptions} {...register("category")} />
            </FormField>

            <FormField label="Budjet turi" required>
              <RadioGroup
                name="budgetType"
                value={budgetType}
                onChange={(v) => setValue("budgetType", v, { shouldValidate: true })}
                options={[
                  { value: "FIXED", label: BUDGET_TYPE_LABELS_UZ.FIXED },
                  { value: "NEGOTIABLE", label: BUDGET_TYPE_LABELS_UZ.NEGOTIABLE },
                ]}
              />
            </FormField>

            {budgetType === "FIXED" && (
              <FormField label="Budjet miqdori" required error={errors.budgetAmount?.message} htmlFor="budgetAmount">
                <CurrencyInput id="budgetAmount" value={budgetAmount ?? undefined} onValueChange={(v) => setValue("budgetAmount", v ?? null)} />
              </FormField>
            )}

            {isEdit && existing && (existing.images?.length ?? 0) > 0 && (
              <FormField label="Mavjud rasmlar">
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
                {isEdit ? "O'zgarishlarni saqlash" : "E'lonni joylashtirish"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-muted">Ko'rinishi</p>
          {category && <CategoryBadge category={category} />}
          <h3 className="font-semibold text-brand-dark">{title || "Sarlavha shu yerda ko'rinadi"}</h3>
          <p className="line-clamp-4 text-sm text-ink-muted">{description || "Tavsif shu yerda ko'rinadi"}</p>
          <p className="mt-auto font-medium text-brand-dark">
            {budgetType === "NEGOTIABLE" ? "Kelishilgan holda" : formatMoney(budgetAmount ?? null)}
          </p>
        </Card>
      </div>
    </div>
  );
}
