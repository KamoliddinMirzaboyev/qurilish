import { useState } from "react";
import { Link } from "react-router-dom";
import { useCompanyProposals } from "@/features/proposals/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { ProposalCard } from "@/components/proposals/ProposalCard";

const tabs = [
  { value: "ALL", label: "Barchasi" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "ACCEPTED", label: "Qabul qilingan" },
  { value: "REJECTED", label: "Rad etilgan" },
] as const;

export default function AdminProposalsPage() {
  const [status, setStatus] = useState<(typeof tabs)[number]["value"]>("ALL");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCompanyProposals(status, page);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Takliflar" subtitle="Barcha muammolaringizga kelgan takliflar bitta joyda." />

      <Tabs
        tabs={tabs as unknown as { value: string; label: string }[]}
        value={status}
        onChange={(v) => {
          setStatus(v as typeof status);
          setPage(1);
        }}
      />

      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : data && data.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          {data.items.map((proposal) => (
            <Link key={proposal.id} to={`/app/admin/problems/${proposal.problemId}/proposals`} className="block">
              <ProposalCard proposal={proposal} showScientist showProblem />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Ushbu bo'limda takliflar mavjud emas." />
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  );
}
