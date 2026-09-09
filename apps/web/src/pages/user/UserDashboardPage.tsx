import { Link } from "react-router-dom";
import { AlertCircle, FileText, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProblems } from "@/features/problems/hooks";
import { useMyProposals } from "@/features/proposals/hooks";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { StatCard, Card, EmptyState } from "@/components/ui/Card";
import { CardGridSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ProposalStatusBadge } from "@/components/ui/Badge";
import { ProblemCard } from "@/components/problems/ProblemCard";
import { formatDate, formatMoney } from "@/lib/format";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const { data: problems, isLoading: problemsLoading } = useProblems({ sort: "newest", page: 1, pageSize: 3 });
  const { data: myProposals, isLoading: proposalsLoading } = useMyProposals();

  const proposals = myProposals?.items ?? [];
  const submitted = myProposals?.total ?? proposals.length;
  const accepted = proposals.filter((p) => p.status === "ACCEPTED").length;
  const pending = proposals.filter((p) => p.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Xush kelibsiz, ${user?.name}`}
        action={
          <Button asLink to="/app/problems">
            Muammolarni ko'rish
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ochiq muammolar" value={problems?.total ?? "—"} icon={<AlertCircle size={20} />} color="brand" />
        <StatCard label="Yuborilgan takliflar" value={submitted} icon={<FileText size={20} />} color="amber" />
        <StatCard label="Qabul qilingan" value={accepted} icon={<CheckCircle size={20} />} color="green" />
        <StatCard label="Kutilayotgan" value={pending} icon={<Clock size={20} />} color="red" />
      </div>

      <div>
        <SectionHeader title="Yangi muammolar" action={<Link to="/app/problems" className="text-sm font-medium text-brand-primary hover:underline">Barchasi</Link>} />
        <div className="mt-4">
          {problemsLoading ? (
            <CardGridSkeleton count={3} />
          ) : problems && problems.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {problems.items.map((p) => (
                <ProblemCard key={p.id} problem={p} />
              ))}
            </div>
          ) : (
            <EmptyState title="O'zingizga mos muammoni toping va birinchi taklifingizni yuboring." />
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="So'nggi takliflarim" />
        <div className="mt-4 flex flex-col gap-3">
          {proposalsLoading ? (
            <ListSkeleton count={3} />
          ) : proposals.length > 0 ? (
            proposals.slice(0, 5).map((p) => (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-medium text-brand-dark">{p.problemTitle}</p>
                  <p className="text-sm text-ink-muted">
                    {p.priceNegotiable ? "Kelishiladi" : formatMoney(p.proposedPrice)} · {formatDate(p.createdAt)}
                  </p>
                </div>
                <ProposalStatusBadge status={p.status} />
              </Card>
            ))
          ) : (
            <EmptyState title="Siz hali taklif yubormagansiz." />
          )}
        </div>
      </div>
    </div>
  );
}
