import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Pencil, ListChecks, XCircle } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useProblem, useCloseProblem } from "@/features/problems/hooks";
import { useMyProposals } from "@/features/proposals/hooks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CategoryBadge, ProblemStatusBadge } from "@/components/ui/Badge";
import { Card, ErrorState, LoadingSkeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/Modal";
import { ProposalFormModal } from "@/components/proposals/ProposalFormModal";
import { formatDate, formatMoney, formatProposalCount } from "@/lib/format";
import { notify } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";

export default function ProblemDetailPage() {
  const { problemId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const problemsBase = pathname.startsWith("/app") ? "/app/problems" : "/problems";
  const { data: problem, isLoading, isError, refetch } = useProblem(problemId);
  const { data: myProposals } = useMyProposals(user?.role === "USER");
  const closeMutation = useCloseProblem();
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-10">
        <LoadingSkeleton className="h-8 w-2/3" />
        <LoadingSkeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  if (isError || !problem) {
    return (
      <div className="mx-auto max-w-content px-4 py-10">
        <ErrorState title="Muammo topilmadi." onRetry={() => refetch()} />
      </div>
    );
  }

  const isOwnerAdmin = user?.role === "ADMIN" && user.id === problem.companyId;
  const myExistingProposal = myProposals?.items.find((p) => p.problemId === problem.id);

  async function handleClose() {
    try {
      await closeMutation.mutateAsync(problem!.id);
      notify.success("E'lon yopildi.");
      setCloseDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiRequestError) notify.error(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <Breadcrumb items={[{ label: "Muammolar", to: problemsBase }, { label: problem.title }]} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col gap-4 lg:col-span-2">
          {problem.images.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {problem.images.map((img) => (
                <div key={img.id} className="aspect-square overflow-hidden rounded-lg bg-surface-muted">
                  <img src={img.url} alt={problem.title} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <CategoryBadge category={problem.category} />
            <ProblemStatusBadge status={problem.status} />
          </div>
          <h1 className="text-2xl font-semibold text-brand-dark">{problem.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
            <span>{problem.companyName}</span>
            <span>{formatDate(problem.createdAt)}</span>
            <span>{formatProposalCount(problem.proposalCount)}</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{problem.description}</p>

          {problem.status !== "OPEN" && (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-ink-muted">
              {problem.status === "MATCHED"
                ? "Ushbu muammo uchun olim allaqachon tanlangan, shu sababli yangi takliflar qabul qilinmaydi."
                : "Ushbu e'lon yopilgan, shu sababli yangi takliflar qabul qilinmaydi."}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-ink-muted">Budjet</p>
            <p className="text-xl font-semibold text-brand-dark">{formatMoney(problem.budgetAmount)}</p>
          </div>

          {!user && (
            <Button asLink to="/login">
              Taklif yuborish
            </Button>
          )}

          {user?.role === "USER" && problem.status === "OPEN" && !myExistingProposal && (
            <Button onClick={() => setProposalModalOpen(true)}>Taklif yuborish</Button>
          )}

          {user?.role === "USER" && myExistingProposal && (
            <div className="rounded-lg bg-brand-primary/10 p-4 text-sm text-brand-primary">
              Siz bu muammoga taklif yuborgansiz.
              <Link to="/app/user/proposals" className="mt-1 block font-medium underline">
                Taklifimni ko'rish
              </Link>
            </div>
          )}

          {isOwnerAdmin && problem.status === "OPEN" && (
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate(`/app/admin/problems/${problem.id}/edit`)}>
                <Pencil size={16} /> Tahrirlash
              </Button>
              <Button variant="outline" onClick={() => navigate(`/app/admin/problems/${problem.id}/proposals`)}>
                <ListChecks size={16} /> Takliflarni ko'rish
              </Button>
              <Button variant="danger" onClick={() => setCloseDialogOpen(true)}>
                <XCircle size={16} /> E'lonni yopish
              </Button>
            </div>
          )}

          {isOwnerAdmin && problem.status === "MATCHED" && (
            <Button asLink to="/app/connections">
              Bog'lanishni ko'rish
            </Button>
          )}
        </Card>
      </div>

      {problem.status === "OPEN" && (
        <ProposalFormModal problemId={problem.id} open={proposalModalOpen} onClose={() => setProposalModalOpen(false)} />
      )}

      <ConfirmationDialog
        open={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={handleClose}
        title="E'lonni yopasizmi?"
        description="E'lon yopilgach, barcha kutilayotgan takliflar rad etiladi va yangi taklif qabul qilinmaydi."
        confirmLabel="Ha, yopish"
        danger
        isLoading={closeMutation.isPending}
      />
    </div>
  );
}
