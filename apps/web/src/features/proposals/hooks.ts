import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Paginated, ProposalListItem } from "@buildscience/shared";
import { api } from "@/lib/api";
import { toQueryString } from "@/lib/query";

export function useProblemProposals(problemId: string | undefined) {
  return useQuery({
    queryKey: ["problem-proposals", problemId],
    queryFn: () => api.get<{ items: ProposalListItem[] }>(`/problems/${problemId}/proposals`),
    enabled: !!problemId,
  });
}

export function useCompanyRecentProposals() {
  return useQuery({
    queryKey: ["company-recent-proposals"],
    queryFn: () => api.get<{ items: ProposalListItem[] }>("/company/proposals/recent"),
  });
}

export function useCompanyProposals(status: string, page: number) {
  return useQuery({
    queryKey: ["company-proposals", status, page],
    queryFn: () => api.get<Paginated<ProposalListItem>>(`/company/proposals${toQueryString({ status, page, pageSize: 20 })}`),
  });
}

export function useMyProposals(enabled = true) {
  return useQuery({
    queryKey: ["my-proposals"],
    queryFn: () => api.get<{ items: ProposalListItem[] }>("/proposals/mine"),
    enabled,
  });
}

export function useProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => api.get<ProposalListItem>(`/proposals/${proposalId}`),
    enabled: !!proposalId,
  });
}

export function useSubmitProposal(problemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.postForm<ProposalListItem>(`/problems/${problemId}/proposals`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["problem", problemId] });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, formData }: { proposalId: string; formData: FormData }) =>
      api.patchForm<ProposalListItem>(`/proposals/${proposalId}`, formData),
    onSuccess: (_data, { proposalId }) => {
      queryClient.invalidateQueries({ queryKey: ["my-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
    },
  });
}

export function useWithdrawProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => api.post<ProposalListItem>(`/proposals/${proposalId}/withdraw`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-proposals"] }),
  });
}

export function useAcceptProposal(problemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => api.post<ProposalListItem>(`/proposals/${proposalId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problem-proposals", problemId] });
      queryClient.invalidateQueries({ queryKey: ["problem", problemId] });
      queryClient.invalidateQueries({ queryKey: ["company-problems"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
    },
  });
}
