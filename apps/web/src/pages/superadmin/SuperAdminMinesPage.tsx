import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useAdminMinesModeration, useDeleteAdminMine } from "@/features/admin/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Card, EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

export default function SuperAdminMinesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);
  const { data, isLoading } = useAdminMinesModeration({ search: debouncedSearch, page });
  const deleteMutation = useDeleteAdminMine();

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      notify.success("Kon o'chirildi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Konlar"
        action={
          <Button asLink to="/superadmin/mines/new">
            <Plus size={16} /> Yangi kon
          </Button>
        }
      />

      <FilterBar>
        <div className="min-w-[220px] flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Kon nomi bo'yicha qidiring" />
        </div>
      </FilterBar>

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : data && data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.items.map((mine) => (
            <Card key={mine.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[220px] flex-1">
                <Link to={`/mines/${mine.id}`} className="font-medium text-brand-dark hover:text-brand-primary">
                  {mine.name}
                </Link>
                <p className="mt-1 text-sm text-ink-muted">
                  {mine.location} · {mine.adminName}
                </p>
              </div>
              <IconButton label="O'chirish" onClick={() => setDeleteTarget(mine.id)}>
                <Trash2 size={16} className="text-danger" />
              </IconButton>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Berilgan mezonlarga mos kon topilmadi." />
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Konni o'chirasizmi?"
        description="Bu amalni ortga qaytarib bo'lmaydi."
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
