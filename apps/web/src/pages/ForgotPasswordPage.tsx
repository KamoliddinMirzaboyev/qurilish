import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@buildscience/shared";
import { FormField, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api, ApiRequestError } from "@/lib/api";
import { notify } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      const response = await api.post<{ message: string; resetToken?: string }>("/auth/forgot-password", values);
      setSubmitted(true);
      if (response.resetToken) {
        setDevResetToken(response.resetToken);
      }
      notify.success(response.message);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError("root", { message: err.message });
        notify.error(err.message);
      }
    }
  }

  return (
    <Modal open title="Parolni tiklash" onClose={() => navigate("/login")}>
      {submitted ? (
        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-xl border border-border-subtle bg-surface-muted/50 p-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="font-semibold text-ink-primary">So'rov qabul qilindi</h4>
            <p className="mt-1 text-sm text-ink-muted">
              Agar ushbu email tizimda mavjud bo'lsa, parolni yangilash bo'yicha ko'rsatma yuborildi.
            </p>
          </div>

          {devResetToken && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <p className="font-semibold mb-1">Dasturchi rejimi (Test link):</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate(`/reset-password?token=${devResetToken}`)}
              >
                Parolni o'zgartirish sahifasiga o'tish
              </Button>
            </div>
          )}

          <Button variant="secondary" className="w-full" onClick={() => navigate("/login")}>
            Kirish oynasiga qaytish
          </Button>
        </div>
      ) : (
        <>
          <p className="-mt-2 mb-4 text-sm text-ink-muted">
            Profilingizga biriktirilgan email manzilini kiriting. Biz sizga parolni tiklash havolasini taqdim etamiz.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField label="Email" required error={errors.email?.message} htmlFor="email">
              <Input
                id="email"
                type="email"
                placeholder="misol@pochta.uz"
                autoComplete="email"
                {...register("email")}
              />
            </FormField>

            {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

            <Button type="submit" isLoading={isSubmitting} className="mt-2">
              Tiklash havolasini yuborish
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-muted">
            Parolni esladingizmi?{" "}
            <Link to="/login" className="font-medium text-brand-primary">
              Kirish
            </Link>
          </p>
        </>
      )}
    </Modal>
  );
}
