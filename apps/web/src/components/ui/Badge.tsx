import clsx from "clsx";
import {
  PROBLEM_STATUS_LABELS_UZ,
  PROPOSAL_STATUS_LABELS_UZ,
  CATEGORY_LABELS_UZ,
  BUDGET_TYPE_LABELS_UZ,
  type ProblemStatus,
  type ProposalStatus,
  type Category,
} from "@buildscience/shared";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

const problemStatusStyles: Record<ProblemStatus, string> = {
  OPEN: "bg-brand-teal/10 text-brand-teal",
  MATCHED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-ink-muted",
};

export function ProblemStatusBadge({ status }: { status: ProblemStatus }) {
  return <Badge className={problemStatusStyles[status]}>{PROBLEM_STATUS_LABELS_UZ[status]}</Badge>;
}

const proposalStatusStyles: Record<ProposalStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  WITHDRAWN: "bg-slate-100 text-ink-muted",
};

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return <Badge className={proposalStatusStyles[status]}>{PROPOSAL_STATUS_LABELS_UZ[status]}</Badge>;
}

export function CategoryBadge({ category }: { category: Category }) {
  return <Badge className="bg-brand-primary/10 text-brand-primary">{CATEGORY_LABELS_UZ[category]}</Badge>;
}

export function BudgetTypeLabel({ type }: { type: "FIXED" | "NEGOTIABLE" }) {
  return <>{BUDGET_TYPE_LABELS_UZ[type]}</>;
}
