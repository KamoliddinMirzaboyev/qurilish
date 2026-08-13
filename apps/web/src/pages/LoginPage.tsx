import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput, type AuthUser } from "@buildscience/shared";
import { FormField } from "@/components/ui/Input";
import { Input, PasswordInput } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/auth/AuthContext";
import { api, ApiRequestError } from "@/lib/api";
import { dashboardPathForRole } from "@/routes/paths";
import { notify } from "@/components/ui/toast";

export default function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    try {
      const user = await api.post<AuthUser>("/auth/login", values);
      setUser(user);
      notify.success("Tizimga kirdingiz.");
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? dashboardPathForRole(user.role));
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError("root", { message: err.message });
        notify.error(err.message);
      }
    }
  }

  return (
    <Modal open title="Kirish" onClose={() => navigate("/")}>
      <p className="-mt-2 mb-4 text-sm text-ink-muted">
        Kontakt ma'lumotlaringiz taklif qabul qilinmaguncha boshqa foydalanuvchilarga ko'rsatilmaydi.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Email yoki Login" required error={errors.email?.message} htmlFor="email">
          <Input id="email" type="text" autoComplete="username" {...register("email")} />
        </FormField>
        <FormField label="Parol" required error={errors.password?.message} htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
        </FormField>

        {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

        <Button type="submit" isLoading={isSubmitting} className="mt-2">
          Kirish
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-muted">
        Akkauntingiz yo'qmi?{" "}
        <Link to="/register" className="font-medium text-brand-primary">
          Ro'yxatdan o'tish
        </Link>
      </p>
    </Modal>
  );
}
