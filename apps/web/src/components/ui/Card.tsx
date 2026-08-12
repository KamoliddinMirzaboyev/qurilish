import clsx from "clsx";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-card border border-surface-border bg-surface-card p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon, color = "brand" }: { label: string; value: string | number; icon?: React.ReactNode; color?: "brand" | "green" | "amber" | "red" }) {
  const colorMap = {
    brand: "bg-brand-primary/10 text-brand-primary",
    green: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <Card className="flex items-start gap-4">
      {icon && (
        <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", colorMap[color])}>
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-ink-muted">{label}</span>
        <span className="text-2xl font-bold text-brand-dark">{value}</span>
      </div>
    </Card>
  );
}

export function EmptyState({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-surface-border bg-white px-6 py-14 text-center">
      <Inbox className="text-ink-muted" size={32} aria-hidden />
      <p className="text-sm text-ink-muted">{title}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title = "Ma'lumotlarni yuklashda xatolik yuz berdi.", onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-danger/20 bg-red-50 px-6 py-14 text-center">
      <AlertCircle className="text-danger" size={32} aria-hidden />
      <p className="text-sm text-danger">{title}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw size={16} /> Qayta urinib ko'rish
        </Button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] [animation:shimmer_1.5s_ease-in-out_infinite]", className)} />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex flex-col gap-3">
          <LoadingSkeleton className="h-4 w-20" />
          <LoadingSkeleton className="h-5 w-full" />
          <LoadingSkeleton className="h-4 w-2/3" />
          <LoadingSkeleton className="h-10 w-full" />
        </Card>
      ))}
    </div>
  );
}
