import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { ProposalListItem } from "@buildscience/shared";
import { useProblem } from "@/features/problems/hooks";
import { useProblemProposals, useAcceptProposal } from "@/features/proposals/hooks";
import { useConnection } from "@/features/connections/hooks";
import type { ConnectionCompanyView } from "@buildscience/shared";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ProblemStatusBadge, ProposalStatusBadge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { ConnectionCard } from "@/components/shared/ConnectionCard";
import { notify } from "@/components/ui/toast";
import { ApiRequestError, API_BASE } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

const sortOptions = [
  { value: "newest", label: "Eng yangi" },
  { value: "priceLow", label: "Eng past narx" },
  { value: "durationShort", label: "Eng qisqa muddat" },
];

function priceValue(p: ProposalListItem) {
  return p.priceNegotiable || !p.proposedPrice ? Number.POSITIVE_INFINITY : Number(p.proposedPrice);
}

export default function AdminProblemProposalsPage() {
  const { problemId } = useParams();
  const [sort, setSort] = useState("newest");
  const [confirmTarget, setConfirmTarget] = useState<ProposalListItem | null>(null);

  const { data: problem } = useProblem(problemId);
  const { data, isLoading } = useProblemProposals(problemId);
  const acceptMutation = useAcceptProposal(problemId ?? "");

  const sortedProposals = useMemo(() => {
    const items = data?.items ?? [];
    const copy = [...items];
    if (sort === "priceLow") copy.sort((a, b) => priceValue(a) - priceValue(b));
    else if (sort === "durationShort") copy.sort((a, b) => a.estimatedDays - b.estimatedDays);
    else copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }, [data, sort]);

  const acceptedProposal = sortedProposals.find((p) => p.status === "ACCEPTED");
  const { data: connection } = useConnection(acceptedProposal?.id);
  const companyConnection = connection as ConnectionCompanyView | undefined;

  async function confirmAccept() {
    if (!confirmTarget) return;
    try {
      await acceptMutation.mutateAsync(confirmTarget.id);
      notify.success("Taklif qabul qilindi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    } finally {
      setConfirmTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Muammolarim", to: "/app/admin/problems" }, { label: "Takliflar" }]} />

      <PageHeader
        title={problem?.title ?? "Takliflar"}
        subtitle={problem ? `${formatMoney(problem.budgetAmount)} · ${data?.items.length ?? 0} ta taklif` : undefined}
        action={problem && <ProblemStatusBadge status={problem.status} />}
      />

      {acceptedProposal && companyConnection && (
        <div className="rounded-card border border-emerald-200 bg-emerald-50 p-5">
          <p className="mb-3 font-medium text-emerald-700">Taklif qabul qilindi</p>
          <ConnectionCard
            problemId={problemId!}
            problemTitle={problem?.title ?? ""}
            contactName={companyConnection.scientistName}
            contactSubtitle={[companyConnection.specialization, companyConnection.organization].filter(Boolean).join(" · ")}
            email={companyConnection.scientistEmail}
            phone={companyConnection.scientistPhone}
            acceptedAt={companyConnection.acceptedAt}
          />
          <p className="mt-3 text-xs text-emerald-700">
            BuildScience tomonlarni bog'lash uchun xizmat qiladi. Shartnoma, to'lov va loyiha ijrosi platformadan tashqarida
            amalga oshiriladi.
          </p>
        </div>
      )}

      {!acceptedProposal && (
        <div className="flex justify-end">
          <Select value={sort} onChange={(e) => setSort(e.target.value)} options={sortOptions} className="w-52" />
        </div>
      )}

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : sortedProposals.length === 0 ? (
        <EmptyState title="Ushbu muammoga hali taklif kelmagan." />
      ) : (
        <div className="flex flex-col gap-4">
          {sortedProposals.map((proposal) => (
            <Card key={proposal.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-brand-dark">{proposal.scientistName}</p>
                  <p className="text-sm text-ink-muted">
                    {[proposal.specialization, proposal.organization].filter(Boolean).join(" · ")}
                  </p>
                  {proposal.scientistBio && <p className="mt-1 text-sm text-ink-muted">{proposal.scientistBio}</p>}
                </div>
                <ProposalStatusBadge status={proposal.status} />
              </div>
              <p className="text-sm text-ink">{proposal.solutionText}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
                <span className="font-medium text-brand-dark">
                  {proposal.priceNegotiable ? "Kelishiladi" : formatMoney(proposal.proposedPrice)}
                </span>
                <span>{proposal.estimatedDays} kun</span>
                <span>{formatDate(proposal.createdAt)}</span>
                {proposal.attachmentOriginalName && (
                  <a href={`${API_BASE}/proposals/${proposal.id}/attachment`} target="_blank" rel="noreferrer" className="text-brand-primary">
                    {proposal.attachmentOriginalName}
                  </a>
                )}
              </div>
              {proposal.status === "PENDING" && !acceptedProposal && (
                <Button className="self-start" onClick={() => setConfirmTarget(proposal)}>
                  Taklifni qabul qilish
                </Button>
              )}
              {proposal.status === "REJECTED" && <p className="text-sm text-ink-muted">Rad etildi</p>}
            </Card>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmAccept}
        title="Taklifni qabul qilasizmi?"
        description="Ushbu taklif qabul qilinsa, boshqa takliflar rad etiladi va siz bilan olimning kontakt ma'lumotlari ochiladi. Bu amalni ortga qaytarib bo'lmaydi."
        confirmLabel="Ha, qabul qilish"
        isLoading={acceptMutation.isPending}
      />
    </div>
  );
}
