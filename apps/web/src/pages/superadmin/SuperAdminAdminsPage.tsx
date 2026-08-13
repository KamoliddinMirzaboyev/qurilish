import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAdminSchema, type CreateAdminInput } from "@buildscience/shared";
import { useAdminUsers, useCreateAdmin } from "@/features/admin/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { FormField, Input, PasswordInput, PhoneInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function SuperAdminAdminsPage() {
  const [page] = useState(1);
  const { data, isLoading } = useAdminUsers({ role: "ADMIN", page });
  const createMutation = useCreateAdmin();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateAdminInput>({ resolver: zodResolver(createAdminSchema) });

  async function onSubmit(values: CreateAdminInput) {
    try {
      await createMutation.mutateAsync(values);
      notify.success("Firma akkaunti yaratildi.");
      reset();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.errors) {
          for (const [field, messages] of Object.entries(err.errors)) {
            setError(field as keyof CreateAdminInput, { message: messages[0] });
          }
        }
        notify.error(err.message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Firmalar (ADMIN)" subtitle="Qurilish firmalari akkauntlari faqat shu yerdan yaratiladi." />

      <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-4 font-semibold text-brand-dark">Yangi firma qo'shish</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField label="Firma nomi" required error={errors.name?.message} htmlFor="name">
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField label="Email" required error={errors.email?.message} htmlFor="email">
            <Input id="email" type="email" {...register("email")} />
          </FormField>
          <FormField label="Telefon raqami" required error={errors.phone?.message} htmlFor="phone">
            <PhoneInput id="phone" {...register("phone")} />
          </FormField>
          <FormField label="Tashkilot (ixtiyoriy)" error={errors.organization?.message} htmlFor="organization">
            <Input id="organization" {...register("organization")} />
          </FormField>
          <FormField label="Parol" required helperText="Kamida 8 ta belgi" error={errors.password?.message} htmlFor="password">
            <PasswordInput id="password" {...register("password")} />
          </FormField>
          <Button type="submit" isLoading={isSubmitting} className="self-start">
            Firma yaratish
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-brand-dark">Mavjud firmalar</h2>
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : data && data.items.length > 0 ? (
          <div className="flex flex-col gap-3">
            {data.items.map((admin) => (
              <Card key={admin.id} className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-brand-dark">{admin.name}</p>
                  <p className="text-sm text-ink-muted">
                    {admin.email} · {admin.phone}
                  </p>
                </div>
                <p className="text-xs text-ink-muted">Yaratilgan: {formatDate(admin.createdAt)}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="Hozircha firma akkauntlari yo'q." />
        )}
      </div>
      </div>
    </div>
  );
}
