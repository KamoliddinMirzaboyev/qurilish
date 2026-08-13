import { useState } from "react";
import type { ProposalListItem, ConnectionScientistView } from "@buildscience/shared";
import { useMyProposals, useWithdrawProposal } from "@/features/proposals/hooks";
import { useConnection } from "@/features/connections/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Card, EmptyState } from "@/components/ui/Card";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { CategoryBadge, ProposalStatusBadge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { ProposalFormModal } from "@/components/proposals/ProposalFormModal";
import { ConnectionCard } from "@/components/shared/ConnectionCard";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

const tabs = [
  { value: "ALL", label: "Barchasi" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "ACCEPTED", label: "Qabul qilingan" },
  { value: "REJECTED", label: "Rad etildi" },
  { value: "WITHDRAWN", label: "Bekor qilingan" },
] as const;

function AcceptedPanel({ proposal }: { proposal: ProposalListItem }) {
  const { data: connection } = useConnection(proposal.id);
  const view = connection as ConnectionScientistView | undefined;
  if (!view) return <ListSkeleton count={1} />;

  return (
    <div className="rounded-card border border-emerald-200 bg-emerald-50 p-5">
      <p className="mb-3 font-medium text-emerald-700">Taklifingiz qabul qilindi</p>
      <ConnectionCard
        problemId={proposal.problemId}
        problemTitle={view.problemTitle}
        contactName={view.companyName}
        email={view.companyEmail}
        phone={view.companyPhone}
        acceptedAt={view.acceptedAt}
      />
      <p className="mt-3 text-xs text-emerald-700">
        BuildScience tomonlarni bog'lash uchun xizmat qiladi. Shartnoma, to'lov va loyiha ijrosi platformadan tashqarida amalga
        oshiriladi.
      </p>
    </div>
  );
}

export default function UserProposalsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("ALL");
  const [editTarget, setEditTarget] = useState<ProposalListItem | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<ProposalListItem | null>(null);
  const { data, isLoading } = useMyProposals();
  const withdrawMutation = useWithdrawProposal();

  const items = (data?.items ?? []).filter((p) => tab === "ALL" || p.status === tab);

  async function confirmWithdraw() {
    if (!withdrawTarget) return;
    try {
      await withdrawMutation.mutateAsync(withdrawTarget.id);
      notify.success("Taklif bekor qilindi.");
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    } finally {
      setWithdrawTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Takliflarim" />
      <Tabs tabs={tabs as unknown as { value: string; label: string }[]} value={tab} onChange={(v) => setTab(v as typeof tab)} />

      {isLoading ? (
        <ListSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState title="Siz hali taklif yubormagansiz." />
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((proposal) =>
            proposal.status === "ACCEPTED" ? (
              <AcceptedPanel key={proposal.id} proposal={proposal} />
            ) : (
              <Card key={proposal.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-brand-primary">{proposal.problemTitle}</p>
                    {proposal.category && <CategoryBadge category={proposal.category} />}
                  </div>
                  <ProposalStatusBadge status={proposal.status} />
                </div>
                <p className="line-clamp-3 text-sm text-ink">{proposal.solutionText}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
                  <span className="font-medium text-brand-dark">
                    {proposal.priceNegotiable ? "Kelishiladi" : formatMoney(proposal.proposedPrice)}
                  </span>
                  <span>{proposal.estimatedDays} kun</span>
                  <span>{formatDate(proposal.createdAt)}</span>
                  {proposal.attachmentOriginalName && <span>📎 {proposal.attachmentOriginalName}</span>}
                </div>

                {proposal.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditTarget(proposal)}>
                      Tahrirlash
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setWithdrawTarget(proposal)}>
                      Taklifni bekor qilish
                    </Button>
                  </div>
                )}
                {proposal.status === "REJECTED" && <p className="text-sm text-ink-muted">Korxona boshqa taklifni tanladi.</p>}
              </Card>
            )
          )}
        </div>
      )}

      {editTarget && (
        <ProposalFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          problemId={editTarget.problemId}
          existing={editTarget}
        />
      )}

      <ConfirmationDialog
        open={!!withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={confirmWithdraw}
        title="Taklifni bekor qilasizmi?"
        description="Bekor qilingan taklifni qayta faollashtirib bo'lmaydi."
        confirmLabel="Ha, bekor qilish"
        danger
        isLoading={withdrawMutation.isPending}
      />
    </div>
  );
}
