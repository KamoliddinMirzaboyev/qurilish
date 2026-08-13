import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Pencil, ListChecks, Eye, Handshake } from "lucide-react";
import { useCompanyProblems, useDeleteProblem } from "@/features/problems/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

const tabs = [
  { value: "ALL", label: "Barchasi" },
  { value: "OPEN", label: "Ochiq" },
  { value: "MATCHED", label: "Olim tanlangan" },
  { value: "CLOSED", label: "Yopilgan" },
] as const;

export default function AdminProblemsPage() {
  const [status, setStatus] = useState<(typeof tabs)[number]["value"]>("ALL");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { data, isLoading } = useCompanyProblems(status, page);
  const deleteMutation = useDeleteProblem();

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      notify.success("Muammo o'chirildi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Muammolarim"
        subtitle={data ? `${data.total} ta muammo` : undefined}
        action={
          <Button asLink to="/app/admin/problems/new">
            <Plus size={16} /> Yangi muammo
          </Button>
        }
      />

      <Tabs
        tabs={tabs as unknown as { value: string; label: string }[]}
        value={status}
        onChange={(v) => {
          setStatus(v as typeof status);
          setPage(1);
        }}
      />

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {problem.status === "OPEN" && (
                    <>
                      <Link
                        to={`/app/admin/problems/${problem.id}/edit`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-primaryHover"
                      >
                        <Pencil size={14} /> Tahrirlash
                      </Link>
                      <Link
                        to={`/app/admin/problems/${problem.id}/proposals`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-primaryHover"
                      >
                        <ListChecks size={14} /> Takliflar
                      </Link>
                      {problem.proposalCount === 0 && (
                        <IconButton label="O'chirish" onClick={() => setDeleteTarget(problem.id)} className="ml-auto text-danger hover:bg-red-50">
                          <Trash2 size={16} />
                        </IconButton>
                      )}
                    </>
                  )}
                  {problem.status === "MATCHED" && (
                    <Link to="/app/connections" className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary">
                      <Handshake size={14} /> Bog'lanish
                    </Link>
                  )}
                  <Link to={`/problems/${problem.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-ink">
                    <Eye size={14} /> Ko'rish
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Ushbu bo'limda muammolar mavjud emas." />
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Muammoni o'chirasizmi?"
        description="Bu amalni ortga qaytarib bo'lmaydi."
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
