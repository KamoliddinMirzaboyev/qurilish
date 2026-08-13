import { useState } from "react";
import { ROLE_LABELS_UZ, USER_STATUS_LABELS_UZ, type Role, type UserStatus, type AuthUser } from "@buildscience/shared";
import { useAdminUsers, useUpdateUserStatus, useDeleteUser } from "@/features/admin/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/Avatar";
import { EmptyState, LoadingSkeleton } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmationDialog, Modal } from "@/components/ui/Modal";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Eye, Ban, CheckCircle2, Trash2 } from "lucide-react";
import clsx from "clsx";

const sortOptions = [
  { value: "newest", label: "Eng yangi" },
  { value: "oldest", label: "Eng eski" },
];

const roleBadgeStyles: Record<Role, string> = {
  SUPERADMIN: "bg-violet-100 text-violet-700",
  ADMIN: "bg-amber-100 text-amber-700",
  USER: "bg-brand-primary/10 text-brand-primary",
};

export default function SuperAdminUsersPage() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewTarget, setViewTarget] = useState<AuthUser | null>(null);
  const [blockTarget, setBlockTarget] = useState<AuthUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);

  const debouncedSearch = useDebounce(search);
  const { data, isLoading } = useAdminUsers({ search: debouncedSearch, role, status, sort, page });
  const statusMutation = useUpdateUserStatus();
  const deleteMutation = useDeleteUser();

  async function confirmToggleStatus() {
    if (!blockTarget) return;
    const nextStatus: UserStatus = blockTarget.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    try {
      await statusMutation.mutateAsync({ userId: blockTarget.id, status: nextStatus });
      notify.success(nextStatus === "BLOCKED" ? "Foydalanuvchi bloklandi." : "Foydalanuvchi faollashtirildi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    } finally {
      setBlockTarget(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      notify.success("Foydalanuvchi o'chirildi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Foydalanuvchilar" subtitle={data ? `${data.total} ta foydalanuvchi` : undefined} />

      <FilterBar>
        <div className="min-w-[220px] flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Ism, email yoki telefon bo'yicha qidiring" />
        </div>
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[{ value: "ALL", label: "Barcha rollar" }, ...Object.entries(ROLE_LABELS_UZ).map(([value, label]) => ({ value, label }))]}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[{ value: "ALL", label: "Barcha holatlar" }, ...Object.entries(USER_STATUS_LABELS_UZ).map(([value, label]) => ({ value, label }))]}
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} options={sortOptions} />
      </FilterBar>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-surface-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-page text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Aloqa</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Ro'yxatdan o'tgan</th>
                  <th className="px-4 py-3 text-right font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => {
                  const isSelf = u.id === me?.id;
                  const canManage = !isSelf && u.role !== "SUPERADMIN";
                  return (
                    <tr key={u.id} className="border-b border-surface-border last:border-0 hover:bg-surface-page">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={u.name} size={34} />
                          <div>
                            <p className="font-medium text-brand-dark">
                              {u.name} {isSelf && <span className="text-xs font-normal text-ink-muted">(siz)</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={roleBadgeStyles[u.role as Role]}>{ROLE_LABELS_UZ[u.role as Role]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-ink">{u.email}</p>
                        <p className="text-xs text-ink-muted">{u.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                          {USER_STATUS_LABELS_UZ[u.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton label="Ko'rish" onClick={() => setViewTarget(u)}>
                            <Eye size={16} />
                          </IconButton>
                          {canManage && (
                            <>
                              <IconButton
                                label={u.status === "ACTIVE" ? "Bloklash" : "Faollashtirish"}
                                onClick={() => setBlockTarget(u)}
                                className={clsx(u.status === "ACTIVE" && "text-amber-600 hover:bg-amber-50")}
                              >
                                {u.status === "ACTIVE" ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                              </IconButton>
                              <IconButton label="O'chirish" onClick={() => setDeleteTarget(u)} className="text-danger hover:bg-red-50">
                                <Trash2 size={16} />
                              </IconButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="Berilgan mezonlarga mos ma'lumot topilmadi." />
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {viewTarget && (
        <Modal open onClose={() => setViewTarget(null)} title={viewTarget.name}>
          <div className="flex flex-col gap-2 text-sm">
            <p>
              <span className="text-ink-muted">Rol:</span> {ROLE_LABELS_UZ[viewTarget.role as Role]}
            </p>
            <p>
              <span className="text-ink-muted">Email:</span> {viewTarget.email}
            </p>
            <p>
              <span className="text-ink-muted">Telefon:</span> {viewTarget.phone}
            </p>
            <p>
              <span className="text-ink-muted">Holat:</span> {USER_STATUS_LABELS_UZ[viewTarget.status]}
            </p>
            <p>
              <span className="text-ink-muted">Ro'yxatdan o'tgan sana:</span> {formatDate(viewTarget.createdAt)}
            </p>
            {viewTarget.organization && (
              <p>
                <span className="text-ink-muted">Tashkilot:</span> {viewTarget.organization}
              </p>
            )}
            {viewTarget.specialization && (
              <p>
                <span className="text-ink-muted">Mutaxassislik:</span> {viewTarget.specialization}
              </p>
            )}
            {viewTarget.bio && (
              <p>
                <span className="text-ink-muted">Bio:</span> {viewTarget.bio}
              </p>
            )}
          </div>
        </Modal>
      )}

      <ConfirmationDialog
        open={!!blockTarget}
        onClose={() => setBlockTarget(null)}
        onConfirm={confirmToggleStatus}
        title={blockTarget?.status === "ACTIVE" ? "Foydalanuvchini bloklaysizmi?" : "Foydalanuvchini faollashtirasizmi?"}
        description="Bloklangan foydalanuvchi tizimga kira olmaydi."
        isLoading={statusMutation.isPending}
        danger={blockTarget?.status === "ACTIVE"}
      />

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Foydalanuvchini o'chirasizmi?"
        description="Bu amalni ortga qaytarib bo'lmaydi."
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
