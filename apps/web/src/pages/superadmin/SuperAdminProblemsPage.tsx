import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";
import { CATEGORY_LABELS_UZ, PROBLEM_STATUS_LABELS_UZ, type ProblemListItem } from "@buildscience/shared";
import { useAdminProblems, useDeleteAdminProblem } from "@/features/admin/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Input";
import { EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

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
    <div className="flex flex-col gap-4">
      <PageHeader title="Muammolar" subtitle={data ? `${data.total} ta muammo` : undefined} />

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              actions={
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/problems/${problem.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-primaryHover"
                  >
                    <Eye size={16} /> Ko'rish
                  </Link>
                  <IconButton label="O'chirish" onClick={() => setDeleteTarget(problem)} className="text-danger hover:bg-red-50">
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              }
            />
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
