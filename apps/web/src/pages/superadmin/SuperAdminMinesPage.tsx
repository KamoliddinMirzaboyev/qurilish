import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Layers, Gauge, Plus, Pencil, Trash2 } from "lucide-react";
import { useAdminMinesModeration, useDeleteAdminMine } from "@/features/admin/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Card, EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { ImageSlider } from "@/components/ui/ImageSlider";
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
        subtitle={data ? `${data.total} ta kon` : undefined}
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
        <CardGridSkeleton count={3} />
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((mine) => (
            <Card key={mine.id} className="flex flex-col gap-0 overflow-hidden !p-0">
              <ImageSlider images={mine.images.map((img) => img.url)} alt={mine.name} className="aspect-video" />
              <div className="flex flex-1 flex-col gap-2.5 p-4">
                <h3 className="font-semibold text-brand-dark">{mine.name}</h3>
                <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <MapPin size={14} className="shrink-0" /> {mine.location}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="shrink-0" /> {mine.rawMaterialType}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Gauge size={14} className="shrink-0" /> {mine.volume}
                  </span>
                </div>
                {mine.description && <p className="line-clamp-2 text-sm text-ink-muted">{mine.description}</p>}
                <p className="text-xs text-ink-muted">E'lon beruvchi: {mine.adminName}</p>

                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <Link to={`/mines/${mine.id}`} className="text-sm font-medium text-brand-primary hover:underline">
                    Ko'rish
                  </Link>
                  <div className="flex gap-1">
                    <Button asLink to={`/superadmin/mines/${mine.id}/edit`} size="sm" variant="outline">
                      <Pencil size={14} /> Tahrirlash
                    </Button>
                    <IconButton label="O'chirish" onClick={() => setDeleteTarget(mine.id)} className="text-danger hover:bg-red-50">
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
              </div>
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
