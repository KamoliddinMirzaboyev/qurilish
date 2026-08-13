import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput, type AuthUser } from "@buildscience/shared";
import { FormField, Input, PasswordInput, PhoneInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/auth/AuthContext";
import { api, ApiRequestError } from "@/lib/api";
import { dashboardPathForRole } from "@/routes/paths";
import { notify } from "@/components/ui/toast";

export default function RegisterPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterInput) {
    try {
      const user = await api.post<AuthUser>("/auth/register", values);
      setUser(user);
      notify.success("Ro'yxatdan o'tildi.");
      navigate(dashboardPathForRole(user.role));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.errors) {
          for (const [field, messages] of Object.entries(err.errors)) {
            setError(field as keyof RegisterInput, { message: messages[0] });
          }
        }
        notify.error(err.message);
      }
    }
  }

  return (
    <Modal open title="Ro'yxatdan o'tish" onClose={() => navigate("/")}>
      <p className="-mt-2 mb-4 text-sm text-ink-muted">
        Firma (ADMIN) akkauntlari faqat hokimiyat tomonidan yaratiladi — bu yerda oddiy foydalanuvchi sifatida
        ro'yxatdan o'tasiz.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="F.I.Sh." required error={errors.name?.message} htmlFor="name">
          <Input id="name" {...register("name")} />
        </FormField>

        <FormField label="Email" required error={errors.email?.message} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>

        <FormField label="Telefon raqami" required error={errors.phone?.message} htmlFor="phone">
          <PhoneInput id="phone" {...register("phone")} />
        </FormField>

        <FormField label="Mutaxassislik" error={errors.specialization?.message} htmlFor="specialization">
          <Input id="specialization" {...register("specialization")} />
        </FormField>
        <FormField label="OTM yoki tashkilot" error={errors.organization?.message} htmlFor="organization">
          <Input id="organization" {...register("organization")} />
        </FormField>

        <FormField label="Parol" required helperText="Kamida 8 ta belgi" error={errors.password?.message} htmlFor="password">
          <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
        </FormField>

        <FormField label="Parolni takrorlang" required error={errors.passwordConfirm?.message} htmlFor="passwordConfirm">
          <PasswordInput id="passwordConfirm" autoComplete="new-password" {...register("passwordConfirm")} />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="mt-2">
          Ro'yxatdan o'tish
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-muted">
        Akkauntingiz bormi?{" "}
        <Link to="/login" className="font-medium text-brand-primary">
          Kirish
        </Link>
      </p>
    </Modal>
  );
}
