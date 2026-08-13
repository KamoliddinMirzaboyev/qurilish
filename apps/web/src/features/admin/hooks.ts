import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminStats,
  AuthUser,
  CreateAdminInput,
  MineDetail,
  Paginated,
  ProblemListItem,
  ProposalListItem,
  WasteListItem,
} from "@buildscience/shared";
import { api } from "@/lib/api";
import { toQueryString } from "@/lib/query";

export function useAdminStats() {
  return useQuery({ queryKey: ["admin-stats"], queryFn: () => api.get<AdminStats>("/admin/stats") });
}

export function useAdminUsers(filters: { search?: string; role?: string; status?: string; sort?: string; page: number }) {
  return useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => api.get<Paginated<AuthUser>>(`/admin/users${toQueryString({ ...filters, pageSize: 20 })}`),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "ACTIVE" | "BLOCKED" }) =>
      api.patch<AuthUser>(`/admin/users/${userId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminInput) => api.post<AuthUser>("/admin/admins", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useAdminProblems(filters: { search?: string; category?: string; status?: string; sort?: string; page: number }) {
  return useQuery({
    queryKey: ["admin-problems", filters],
    queryFn: () => api.get<Paginated<ProblemListItem>>(`/admin/problems${toQueryString({ ...filters, pageSize: 20 })}`),
  });
}

export function useDeleteAdminProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (problemId: string) => api.delete(`/admin/problems/${problemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-problems"] }),
  });
}

export function useAdminProposals(filters: { search?: string; status?: string; sort?: string; page: number }) {
  return useQuery({
    queryKey: ["admin-proposals", filters],
    queryFn: () => api.get<Paginated<ProposalListItem>>(`/admin/proposals${toQueryString({ ...filters, pageSize: 20 })}`),
  });
}

export function useDeleteAdminProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => api.delete(`/admin/proposals/${proposalId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-proposals"] }),
  });
}

export function useAdminMinesModeration(filters: { search?: string; sort?: string; page: number }) {
  return useQuery({
    queryKey: ["admin-mines-moderation", filters],
    queryFn: () => api.get<Paginated<MineDetail>>(`/admin/mines${toQueryString({ ...filters, pageSize: 20 })}`),
  });
}

export function useDeleteAdminMine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mineId: string) => api.delete(`/admin/mines/${mineId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-mines-moderation"] }),
  });
}

export function useAdminWasteModeration(filters: { search?: string; sort?: string; page: number }) {
  return useQuery({
    queryKey: ["admin-waste-moderation", filters],
    queryFn: () => api.get<Paginated<WasteListItem>>(`/admin/waste${toQueryString({ ...filters, pageSize: 20 })}`),
  });
}

export function useDeleteAdminWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (wasteId: string) => api.delete(`/admin/waste/${wasteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-waste-moderation"] }),
  });
}
