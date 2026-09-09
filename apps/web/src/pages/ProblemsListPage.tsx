import { useSearchParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { CATEGORY_LABELS_UZ, BUDGET_TYPE_LABELS_UZ, type Category, type BudgetType } from "@buildscience/shared";
import { useProblems } from "@/features/problems/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";
import { pageFromSearch } from "@/lib/session";

const sortOptions = [
  { value: "newest", label: "Eng yangi" },
  { value: "oldest", label: "Eng eski" },
  { value: "budgetHigh", label: "Budjet: yuqoridan" },
  { value: "budgetLow", label: "Budjet: pastdan" },
];

export default function ProblemsListPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const category = (params.get("category") ?? "") as Category | "";
  const budgetType = (params.get("budgetType") ?? "") as BudgetType | "";
  const sort = params.get("sort") ?? "newest";
  const page = pageFromSearch(params.get("page"));

  const debouncedSearch = useDebounce(search);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  const { data, isLoading, isError, refetch } = useProblems({
    search: debouncedSearch || undefined,
    category: category || undefined,
    budgetType: budgetType || undefined,
    sort,
    page,
    pageSize: 12,
  });

  const hasFilters = !!(search || category || budgetType || sort !== "newest");

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <PageHeader title="Muammolar banki" subtitle="Qurilish va ishlab chiqarish sohasidagi real muammolarni ko'rib chiqing." />

      <div className="mt-6">
        <FilterBar>
          <div className="min-w-[240px] flex-1">
            <SearchInput value={search} onChange={(v) => updateParam("search", v)} placeholder="Muammo nomi yoki tavsifi bo'yicha qidiring" />
          </div>
          <Select
            value={category}
            onChange={(e) => updateParam("category", e.target.value)}
            options={[{ value: "", label: "Barcha yo'nalishlar" }, ...Object.entries(CATEGORY_LABELS_UZ).map(([value, label]) => ({ value, label }))]}
          />
          <Select
            value={budgetType}
            onChange={(e) => updateParam("budgetType", e.target.value)}
            options={[{ value: "", label: "Barchasi" }, ...Object.entries(BUDGET_TYPE_LABELS_UZ).map(([value, label]) => ({ value, label }))]}
          />
          <Select value={sort} onChange={(e) => updateParam("sort", e.target.value)} options={sortOptions} />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setParams({})}>
              <RotateCcw size={15} /> Tozalash
            </Button>
          )}
        </FilterBar>
      </div>

      <p className="mt-4 text-sm text-ink-muted">{data ? `${formatNumber(data.total)} ta natija` : ""}</p>

      <div className="mt-4">
        {isLoading ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data && data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        ) : (
          <EmptyState title={hasFilters ? "So'rovingiz bo'yicha muammolar topilmadi." : "Hozircha ochiq muammolar mavjud emas."} />
        )}
      </div>

      {data && (
        <div className="mt-8">
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(p) => updateParam("page", String(p))} />
        </div>
      )}
    </div>
  );
}
