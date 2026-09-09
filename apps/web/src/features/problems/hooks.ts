import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanyStats, CreateProblemInput, Paginated, ProblemDetail, ProblemListItem } from "@buildscience/shared";
import { api } from "@/lib/api";
import { toQueryString } from "@/lib/query";

export interface ProblemFilters {
  search?: string;
  category?: string;
  budgetType?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export function useProblems(filters: ProblemFilters) {
  return useQuery({
    queryKey: ["problems", filters],
    queryFn: () => api.get<Paginated<ProblemListItem>>(`/problems${toQueryString(filters)}`),
  });
}

export function useCompanyProblems(status: string, page: number, pageSize = 20) {
  return useQuery({
    queryKey: ["company-problems", status, page, pageSize],
    queryFn: () => api.get<Paginated<ProblemListItem>>(`/company/problems${toQueryString({ status, page, pageSize })}`),
  });
}

export function useCompanyStats() {
  return useQuery({
    queryKey: ["company-stats"],
    queryFn: () => api.get<CompanyStats>("/company/stats"),
  });
}

export function useProblem(problemId: string | undefined) {
  return useQuery({
    queryKey: ["problem", problemId],
    queryFn: () => api.get<ProblemDetail>(`/problems/${problemId}`),
    enabled: !!problemId,
  });
}

function toFormData(input: CreateProblemInput, images: File[]) {
  const formData = new FormData();
  const payload = {
    title: input.title,
    description: input.description,
    category: input.category,
    budgetType: input.budgetType,
    budgetAmount: input.budgetAmount ?? null,
  };
  formData.append("payload", JSON.stringify(payload));
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("budgetType", input.budgetType);
  if (input.budgetAmount != null) formData.append("budgetAmount", String(input.budgetAmount));
  images.forEach((file) => formData.append("images", file));
  return formData;
}

function normalizeProblemInput(input: CreateProblemInput): CreateProblemInput {
  return {
    ...input,
    budgetAmount: input.budgetType === "NEGOTIABLE" ? null : input.budgetAmount ?? null,
  };
}

export function useCreateProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: CreateProblemInput; images: File[] }) => {
      const body = normalizeProblemInput(input);
      return images.length > 0
        ? api.postForm<ProblemDetail>("/problems", toFormData(body, images))
        : api.post<ProblemDetail>("/problems", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-problems"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
    },
  });
}

export function useUpdateProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ problemId, input, images }: { problemId: string; input: CreateProblemInput; images: File[] }) => {
      const body = normalizeProblemInput(input);
      return images.length > 0
        ? api.patchForm<ProblemDetail>(`/problems/${problemId}`, toFormData(body, images))
        : api.patch<ProblemDetail>(`/problems/${problemId}`, body);
    },
    onSuccess: (_data, { problemId }) => {
      queryClient.invalidateQueries({ queryKey: ["company-problems"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["problem", problemId] });
    },
  });
}

export function useDeleteProblemImage(problemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.delete(`/problems/${problemId}/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problem", problemId] });
      queryClient.invalidateQueries({ queryKey: ["company-problems"] });
    },
  });
}

export function useCloseProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (problemId: string) => api.post<ProblemDetail>(`/problems/${problemId}/close`),
    onSuccess: (_data, problemId) => {
      queryClient.invalidateQueries({ queryKey: ["company-problems"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
      queryClient.invalidateQueries({ queryKey: ["problem", problemId] });
    },
  });
}

export function useDeleteProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (problemId: string) => api.delete(`/problems/${problemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-problems"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
    },
  });
}
