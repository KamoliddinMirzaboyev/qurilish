import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProposalSchema, type CreateProposalInput, type ProposalListItem } from "@buildscience/shared";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Textarea, Input, Checkbox, CurrencyInput } from "@/components/ui/Input";
import { FileUploader } from "@/components/ui/FileUploader";
import { notify } from "@/components/ui/toast";
import { useSubmitProposal, useUpdateProposal } from "@/features/proposals/hooks";
import { ApiRequestError } from "@/lib/api";

interface ProposalFormModalProps {
  open: boolean;
  onClose: () => void;
  problemId: string;
  existing?: ProposalListItem;
  onSuccess?: () => void;
}

export function ProposalFormModal({ open, onClose, problemId, existing, onSuccess }: ProposalFormModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const submitMutation = useSubmitProposal(problemId);
  const updateMutation = useUpdateProposal();
  const isEdit = !!existing;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProposalInput>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: existing
      ? {
          solutionText: existing.solutionText,
          estimatedDays: existing.estimatedDays,
          priceNegotiable: existing.priceNegotiable,
          proposedPrice: existing.proposedPrice ? Number(existing.proposedPrice) : undefined,
        }
      : { priceNegotiable: false },
  });

  const priceNegotiable = watch("priceNegotiable");
  const solutionText = watch("solutionText") ?? "";

  async function onSubmit(values: CreateProposalInput) {
    const formData = new FormData();
    formData.set("solutionText", values.solutionText);
    formData.set("estimatedDays", String(values.estimatedDays));
    formData.set("priceNegotiable", String(values.priceNegotiable));
    if (!values.priceNegotiable && values.proposedPrice) formData.set("proposedPrice", String(values.proposedPrice));
    if (file) formData.set("attachment", file);

    try {
      if (isEdit && existing) {
        await updateMutation.mutateAsync({ proposalId: existing.id, formData });
      } else {
        await submitMutation.mutateAsync(formData);
      }
      notify.success(isEdit ? "Taklif yangilandi." : "Taklifingiz muvaffaqiyatli yuborildi.");
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    }
  }

  const isSubmitting = submitMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Taklifni tahrirlash" : "Taklif yuborish"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Mening yechimim" required error={errors.solutionText?.message} htmlFor="solutionText">
          <Textarea
            id="solutionText"
            {...register("solutionText")}
            placeholder="Muammoni qanday hal qilishingiz, tajribangiz va taklif etayotgan yondashuvingizni qisqacha yozing."
          />
          <p className="text-right text-xs text-ink-muted">{solutionText.length} / 3000</p>
        </FormField>

        <FormField label="Bajarish muddati (kun)" required error={errors.estimatedDays?.message} htmlFor="estimatedDays">
          <Input id="estimatedDays" type="number" min={1} {...register("estimatedDays", { valueAsNumber: true })} />
        </FormField>

        <Checkbox label="Narx kelishiladi" {...register("priceNegotiable")} />

        {!priceNegotiable && (
          <FormField label="Taklif narxi" required error={errors.proposedPrice?.message} htmlFor="proposedPrice">
            <CurrencyInput
              id="proposedPrice"
              value={watch("proposedPrice") ?? undefined}
              onValueChange={(v) => setValue("proposedPrice", v ?? null)}
            />
          </FormField>
        )}

        <FormField label="Fayl biriktirish">
          {isEdit && existing?.attachmentOriginalName && !file && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-surface-border bg-slate-50 px-3 py-2 text-xs text-ink-muted">
              <span>Hozirgi fayl: <strong className="text-ink">{existing.attachmentOriginalName}</strong></span>
              <span className="text-[11px] text-brand-primary">O'zgartirish uchun yangi fayl tanlang</span>
            </div>
          )}
          <FileUploader file={file} onChange={setFile} />
        </FormField>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Saqlash" : "Taklif yuborish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
