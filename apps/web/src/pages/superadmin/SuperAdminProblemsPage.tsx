import { useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORY_LABELS_UZ, PROBLEM_STATUS_LABELS_UZ, type ProblemListItem } from "@buildscience/shared";
import { useAdminProblems, useDeleteAdminProblem } from "@/features/admin/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Input";
import { Card, EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { ProblemStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney, formatProposalCount } from "@/lib/format";

const sortOptions = [
  { value: "newest", label: "Eng yangi" },
  { value: "oldest", label: "Eng eski" },
];

export default function SuperAdminProblemsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ProblemListItem | null>(null);

  const debouncedSearch = useDebounce(search);
  const { data, isLoading } = useAdminProblems({ search: debouncedSearch, category, status, sort, page });
  const deleteMutation = useDeleteAdminProblem();

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      notify.success("Muammo o'chirildi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Muammolar" />

      <FilterBar>
        <div className="min-w-[220px] flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Sarlavha bo'yicha qidiring" />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: "ALL", label: "Barcha yo'nalishlar" }, ...Object.entries(CATEGORY_LABELS_UZ).map(([value, label]) => ({ value, label }))]}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[{ value: "ALL", label: "Barcha holatlar" }, ...Object.entries(PROBLEM_STATUS_LABELS_UZ).map(([value, label]) => ({ value, label }))]}
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value)} options={sortOptions} />
      </FilterBar>

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : data && data.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {data.items.map((problem) => (
            <Card key={problem.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[220px] flex-1">
                <div className="mb-1">
                  <ProblemStatusBadge status={problem.status} />
                </div>
                <p className="font-medium text-brand-dark">{problem.title}</p>
                <p className="text-sm text-ink-muted">
                  {problem.companyName} · {formatMoney(problem.budgetAmount)} · {formatProposalCount(problem.proposalCount)} ·{" "}
                  {formatDate(problem.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/problems/${problem.id}`} className="text-sm font-medium text-brand-primary">
                  Ko'rish
                </Link>
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(problem)}>
                  O'chirish
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Berilgan mezonlarga mos ma'lumot topilmadi." />
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Ushbu muammoni o'chirasizmi?"
        description="Muammo platformada ko'rinmaydi."
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
