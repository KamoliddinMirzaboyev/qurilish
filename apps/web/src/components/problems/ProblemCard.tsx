import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ProblemListItem } from "@buildscience/shared";
import { Card } from "@/components/ui/Card";
import { CategoryBadge, ProblemStatusBadge } from "@/components/ui/Badge";
import { ImageSlider } from "@/components/ui/ImageSlider";
import { formatMoney, formatProposalCount, formatRelative } from "@/lib/format";

export function ProblemCard({ problem, actions }: { problem: ProblemListItem; actions?: ReactNode }) {
  const { pathname } = useLocation();
  const base = pathname.startsWith("/app") ? "/app/problems" : "/problems";
  const slides = problem.imageUrls?.length ? problem.imageUrls : problem.coverImageUrl ? [problem.coverImageUrl] : [];

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden !p-0 transition-shadow duration-150 hover:shadow-md">
      <ImageSlider images={slides} alt={problem.title} className="aspect-video" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge category={problem.category} />
          <ProblemStatusBadge status={problem.status} />
        </div>
        <Link to={`${base}/${problem.id}`} className="line-clamp-2 text-base font-semibold text-brand-dark hover:text-brand-primary">
          {problem.title}
        </Link>
        <p className="line-clamp-2 text-sm text-ink-muted">{problem.descriptionExcerpt}</p>
        <div className="mt-auto flex flex-col gap-2 border-t border-surface-border pt-3 text-sm">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="truncate">{problem.companyName}</span>
            <span className="shrink-0">{formatRelative(problem.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-brand-dark">{formatMoney(problem.budgetAmount)}</span>
            <span className="text-ink-muted">{formatProposalCount(problem.proposalCount)}</span>
          </div>
        </div>
        {actions ?? (
          <Link
            to={`${base}/${problem.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-primary hover:text-brand-primaryHover"
          >
            Batafsil <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </Card>
  );
}
