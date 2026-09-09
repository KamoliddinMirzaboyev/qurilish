import { useSearchParams } from "react-router-dom";
import { useMines } from "@/features/mines/hooks";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, FilterBar } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { MineCard } from "@/components/mines/MineCard";
import { MineMap } from "@/components/mines/MineMap";
import { useMineMarkers } from "@/features/mines/useMineMarkers";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";
import { pageFromSearch } from "@/lib/session";

export default function MinesListPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const page = pageFromSearch(params.get("page"));
  const debouncedSearch = useDebounce(search);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  const { data, isLoading, isError, refetch } = useMines({ search: debouncedSearch || undefined, page, pageSize: 12 });
  const mapMarkers = useMineMarkers(data?.items ?? []);

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <PageHeader title="Konlar katalogi" subtitle="Qurilish xomashyosi manbalari — kon joylashuvi, turi va hajmi bilan." />

      <div className="mt-6">
        <FilterBar>
          <div className="min-w-[240px] flex-1">
            <SearchInput value={search} onChange={(v) => updateParam("search", v)} placeholder="Kon nomi bo'yicha qidiring" />
          </div>
        </FilterBar>
      </div>

      {!isLoading && !isError && (data?.items.length ?? 0) > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-surface-border">
          <MineMap markers={mapMarkers} className="h-80 w-full" />
        </div>
      )}

      <p className="mt-4 text-sm text-ink-muted">{data ? `${formatNumber(data.total)} ta natija` : ""}</p>

      <div className="mt-4">
        {isLoading ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data && data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((mine) => (
              <MineCard key={mine.id} mine={mine} />
            ))}
          </div>
        ) : (
          <EmptyState title="Hozircha konlar mavjud emas." />
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
