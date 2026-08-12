import { useState } from "react";
import { ROLE_LABELS_UZ, USER_STATUS_LABELS_UZ, type Role, type UserStatus, type AuthUser } from "@buildscience/shared";
import { useAdminUsers, useUpdateUserStatus, useDeleteUser } from "@/features/admin/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmationDialog, Modal } from "@/components/ui/Modal";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/format";

const sortOptions = [
  { value: "newest", label: "Eng yangi" },
  { value: "oldest", label: "Eng eski" },
];

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
      <PageHeader title="Foydalanuvchilar" />

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
        <CardGridSkeleton count={4} />
      ) : data && data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.items.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[200px] flex-1">
                <p className="font-medium text-brand-dark">
                  {u.name} {u.id === me?.id && <span className="text-xs text-ink-muted">(siz)</span>}
                </p>
                <p className="text-sm text-ink-muted">
                  {ROLE_LABELS_UZ[u.role as Role]} · {u.email} · {u.phone}
                </p>
                <p className="text-xs text-ink-muted">Ro'yxatdan o'tgan: {formatDate(u.createdAt)}</p>
              </div>
              <Badge className={u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                {USER_STATUS_LABELS_UZ[u.status]}
              </Badge>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setViewTarget(u)}>
                  Ko'rish
                </Button>
                {u.id !== me?.id && u.role !== "SUPERADMIN" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setBlockTarget(u)}>
                      {u.status === "ACTIVE" ? "Bloklash" : "Faollashtirish"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(u)}>
                      O'chirish
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
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
