import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useCompanyProblems, useDeleteProblem } from "@/features/problems/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Card, EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { ProblemStatusBadge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { formatMoney, formatProposalCount, formatDate } from "@/lib/format";

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Muammolarim"
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
        <CardGridSkeleton count={4} />
      ) : data && data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.items.map((problem) => (
            <Card key={problem.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[220px] flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <ProblemStatusBadge status={problem.status} />
                </div>
                <Link to={`/problems/${problem.id}`} className="font-medium text-brand-dark hover:text-brand-primary">
                  {problem.title}
                </Link>
                <p className="mt-1 text-sm text-ink-muted">
                  {formatMoney(problem.budgetAmount)} · {formatProposalCount(problem.proposalCount)} · {formatDate(problem.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {problem.status === "OPEN" && (
                  <>
                    <Link to={`/app/admin/problems/${problem.id}/edit`} className="text-sm font-medium text-brand-primary">
                      Tahrirlash
                    </Link>
                    <Link to={`/app/admin/problems/${problem.id}/proposals`} className="text-sm font-medium text-brand-primary">
                      Takliflar
                    </Link>
                    {problem.proposalCount === 0 && (
                      <IconButton label="O'chirish" onClick={() => setDeleteTarget(problem.id)}>
                        <Trash2 size={16} className="text-danger" />
                      </IconButton>
                    )}
                  </>
                )}
                {problem.status === "MATCHED" && (
                  <Link to="/app/connections" className="text-sm font-medium text-brand-primary">
                    Bog'lanishni ko'rish
                  </Link>
                )}
                <Link to={`/problems/${problem.id}`} className="text-sm font-medium text-ink-muted">
                  Ko'rish
                </Link>
              </div>
            </Card>
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
