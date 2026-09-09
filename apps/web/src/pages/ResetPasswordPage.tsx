import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@buildscience/shared";
import { FormField, Input, PasswordInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api, ApiRequestError } from "@/lib/api";
import { notify } from "@/components/ui/toast";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
    },
  });

  async function onSubmit(values: ResetPasswordInput) {
    try {
      await api.post("/auth/reset-password", values);
      notify.success("Parolingiz muvaffaqiyatli yangilandi! Yangi parol bilan tizimga kiring.");
      navigate("/login");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError("root", { message: err.message });
        notify.error(err.message);
      }
    }
  }

  return (
    <Modal open title="Yangi parol o'rnatish" onClose={() => navigate("/login")}>
      <p className="-mt-2 mb-4 text-sm text-ink-muted">
        Xavfsizlik talablariga javob beruvchi yangi kuchli parol kiriting.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {!tokenFromUrl && (
          <FormField label="Tiklash kodi / token" required error={errors.token?.message} htmlFor="token">
            <Input id="token" placeholder="Tokenni kiriting" {...register("token")} />
          </FormField>
        )}

        <FormField label="Yangi parol" required error={errors.newPassword?.message} htmlFor="newPassword">
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            placeholder="Kamida 8 belgi, harf va raqam"
            {...register("newPassword")}
          />
        </FormField>

        <FormField
          label="Yangi parolni tasdiqlang"
          required
          error={errors.confirmPassword?.message}
          htmlFor="confirmPassword"
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Parolni qayta kiriting"
            {...register("confirmPassword")}
          />
        </FormField>

        {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

        <Button type="submit" isLoading={isSubmitting} className="mt-2">
          Parolni yangilash
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-medium text-brand-primary">
          Kirish oynasiga qaytish
        </Link>
      </p>
    </Modal>
  );
}
