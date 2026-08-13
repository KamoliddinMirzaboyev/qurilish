import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] [animation:shimmer_1.5s_ease-in-out_infinite]",
        className
      )}
    />
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-surface-border bg-white p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-card border border-surface-border bg-white">
          <Skeleton className="aspect-video rounded-none" />
          <div className="flex flex-col gap-2.5 p-4">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="ml-auto h-5 w-14" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-1 h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-card border border-surface-border bg-white p-4">
          <Skeleton className="h-12 w-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="mt-2 h-3 w-2/5" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-52" />
      <div className="grid gap-4 rounded-card border border-surface-border bg-white p-5 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="sm:col-span-2">
          <Skeleton className="mb-2 h-3.5 w-20" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="sm:col-span-2">
          <Skeleton className="mb-2 h-3.5 w-28" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="aspect-[16/10] min-h-[220px] w-full" />
          <div className="mt-4 rounded-card border border-surface-border bg-white p-5">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="mt-3 h-4 w-1/2" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>
        </div>
        <div className="rounded-card border border-surface-border bg-white p-5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-2 h-6 w-40" />
          <Skeleton className="mt-5 h-3.5 w-16" />
          <Skeleton className="mt-2 h-6 w-28" />
        </div>
      </div>
    </div>
  );
}

export function PublicChromeSkeleton() {
  return (
    <div className="min-h-screen bg-surface-page">
      <div className="flex h-16 items-center justify-between border-b border-surface-border bg-white px-4">
        <Skeleton className="h-7 w-36" />
        <div className="hidden gap-3 md:flex">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <PageSkeleton />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-6">
        <CardGridSkeleton count={6} />
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-surface-page">
      <aside className="hidden w-56 shrink-0 border-r border-surface-border bg-white p-3 md:block">
        <Skeleton className="mb-5 h-7 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-end border-b border-surface-border bg-white px-4">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="p-4">
          <Skeleton className="mb-4 h-7 w-44" />
          <CardGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
