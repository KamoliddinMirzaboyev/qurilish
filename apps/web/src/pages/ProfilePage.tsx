import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, changePasswordSchema, type UpdateProfileInput, type ChangePasswordInput, type AuthUser } from "@buildscience/shared";
import { useAuth } from "@/features/auth/AuthContext";
import { api, ApiRequestError } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FormField, Input, PhoneInput, PasswordInput, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { notify } from "@/components/ui/toast";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isUser = user?.role === "USER";

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      organization: user?.organization ?? "",
      specialization: user?.specialization ?? "",
      bio: user?.bio ?? "",
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        phone: user.phone,
        organization: user.organization ?? "",
        specialization: user.specialization ?? "",
        bio: user.bio ?? "",
      });
    }
  }, [user, profileForm]);

  const passwordForm = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSaveProfile(values: UpdateProfileInput) {
    try {
      const updated = await api.patch<AuthUser>("/auth/profile", values);
      setUser(updated);
      notify.success("O'zgarishlar saqlandi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    }
  }

  async function onChangePassword(values: ChangePasswordInput) {
    try {
      await api.patch("/auth/password", values);
      notify.success("Parol yangilandi.");
      passwordForm.reset();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        notify.error(err.message);
        passwordForm.setError("currentPassword", { message: err.message });
      }
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profil" />

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold text-brand-dark">Shaxsiy ma'lumotlar</h2>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="flex flex-col gap-4">
          <FormField
            label={isAdmin ? "Firma nomi" : isUser ? "F.I.Sh." : "Ism"}
            required
            error={profileForm.formState.errors.name?.message}
            htmlFor="name"
          >
            <Input id="name" {...profileForm.register("name")} />
          </FormField>

          <FormField label="Email">
            <Input value={user.email} disabled />
          </FormField>

          <FormField
            label="Telefon raqami"
            required
            helperText="Telefon raqamingiz faqat qabul qilingan taklif ishtirokchisiga ko'rsatiladi."
            error={profileForm.formState.errors.phone?.message}
            htmlFor="phone"
          >
            <PhoneInput id="phone" {...profileForm.register("phone")} />
          </FormField>

          {isUser && (
            <>
              <FormField label="Mutaxassislik" error={profileForm.formState.errors.specialization?.message} htmlFor="specialization">
                <Input id="specialization" {...profileForm.register("specialization")} />
              </FormField>
              <FormField label="OTM yoki tashkilot" error={profileForm.formState.errors.organization?.message} htmlFor="organization">
                <Input id="organization" {...profileForm.register("organization")} />
              </FormField>
              <FormField label="Bio" error={profileForm.formState.errors.bio?.message} htmlFor="bio">
                <Textarea id="bio" {...profileForm.register("bio")} />
              </FormField>
            </>
          )}

          <Button type="submit" isLoading={profileForm.formState.isSubmitting} className="self-start">
            O'zgarishlarni saqlash
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold text-brand-dark">Parolni o'zgartirish</h2>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="flex flex-col gap-4">
          <FormField label="Joriy parol" required error={passwordForm.formState.errors.currentPassword?.message} htmlFor="currentPassword">
            <PasswordInput id="currentPassword" {...passwordForm.register("currentPassword")} />
          </FormField>
          <FormField label="Yangi parol" required error={passwordForm.formState.errors.newPassword?.message} htmlFor="newPassword">
            <PasswordInput id="newPassword" {...passwordForm.register("newPassword")} />
          </FormField>
          <FormField label="Yangi parolni tasdiqlang" required error={passwordForm.formState.errors.confirmPassword?.message} htmlFor="confirmPassword">
            <PasswordInput id="confirmPassword" {...passwordForm.register("confirmPassword")} />
          </FormField>
          <Button type="submit" isLoading={passwordForm.formState.isSubmitting} variant="outline" className="self-start">
            Parolni yangilash
          </Button>
        </form>
      </Card>
    </div>
  );
}
