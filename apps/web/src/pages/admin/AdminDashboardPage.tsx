import { Plus, AlertCircle, FileText, Users, CheckCircle } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useCompanyProblems, useCompanyStats } from "@/features/problems/hooks";
import { useCompanyRecentProposals } from "@/features/proposals/hooks";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { StatCard, Card, EmptyState, LoadingSkeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProblemStatusBadge } from "@/components/ui/Badge";
import { Link } from "react-router-dom";
import { formatDate, formatMoney, formatProposalCount } from "@/lib/format";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { data: problems, isLoading } = useCompanyProblems("ALL", 1);
  const { data: recentProposals } = useCompanyRecentProposals();
  const { data: stats, isLoading: statsLoading } = useCompanyStats();

  const items = problems?.items ?? [];
  const hasAnyProblems = items.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Xush kelibsiz, ${user?.name}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asLink to="/app/admin/waste/new" variant="outline">
              <Plus size={16} /> Chiqindi qo'shish
            </Button>
            <Button asLink to="/app/admin/problems/new">
              <Plus size={16} /> Yangi muammo joylashtirish
            </Button>
          </div>
        }
      />

      {!isLoading && !hasAnyProblems ? (
        <EmptyState
          title="Birinchi muammoingizni joylashtiring va olimlardan taklif oling."
          action={
            <Button asLink to="/app/admin/problems/new">
              Muammo yaratish
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statsLoading || !stats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-[88px] rounded-card" />
              ))
            ) : (
              <>
                <StatCard label="Ochiq muammolar" value={stats.openProblems} icon={<AlertCircle size={20} />} color="brand" />
                <StatCard label="Jami takliflar" value={stats.totalProposals} icon={<FileText size={20} />} color="amber" />
                <StatCard label="Tanlangan olimlar" value={stats.matchedProblems} icon={<Users size={20} />} color="green" />
                <StatCard label="Yopilgan e'lonlar" value={stats.closedProblems} icon={<CheckCircle size={20} />} color="red" />
              </>
            )}
          </div>

          <div>
            <SectionHeader title="So'nggi muammolarim" action={<Link to="/app/admin/problems" className="text-sm font-medium text-brand-primary hover:underline">Barchasi</Link>} />
            <div className="mt-4 flex flex-col gap-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} className="h-[72px] rounded-card" />)
              ) : (
                items.slice(0, 5).map((problem) => (
                  <Card key={problem.id} className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-md">
                    <div>
                      <Link to={`/problems/${problem.id}`} className="font-medium text-brand-dark hover:text-brand-primary">
                        {problem.title}
                      </Link>
                      <p className="text-sm text-ink-muted">
                        {formatMoney(problem.budgetAmount)} · {formatProposalCount(problem.proposalCount)}
                      </p>
                    </div>
                    <ProblemStatusBadge status={problem.status} />
                  </Card>
                ))
              )}
            </div>
          </div>

          <div>
            <SectionHeader title="Yangi takliflar" />
            <div className="mt-4 flex flex-col gap-3">
              {!recentProposals ? (
                Array.from({ length: 2 }).map((_, i) => <LoadingSkeleton key={i} className="h-[72px] rounded-card" />)
              ) : recentProposals.items.length > 0 ? (
                recentProposals.items.map((proposal) => (
                  <Card key={proposal.id} className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-md">
                    <div>
                      <p className="font-medium text-brand-dark">{proposal.scientistName}</p>
                      <p className="text-sm text-ink-muted">{proposal.problemTitle}</p>
                    </div>
                    <div className="text-right text-sm text-ink-muted">
                      <p className="font-medium text-brand-dark">
                        {proposal.priceNegotiable ? "Kelishiladi" : formatMoney(proposal.proposedPrice)}
                      </p>
                      <p>{formatDate(proposal.createdAt)}</p>
                    </div>
                  </Card>
                ))
              ) : (
                <EmptyState title="Ushbu muammoga hali taklif kelmagan." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
