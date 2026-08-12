import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MineDetail, MineInput, MineListItem, Paginated } from "@buildscience/shared";
import { api } from "@/lib/api";
import { toQueryString } from "@/lib/query";

export function useMines(filters: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["mines", filters],
    queryFn: () => api.get<Paginated<MineListItem>>(`/mines${toQueryString(filters)}`),
  });
}

export function useMine(mineId: string | undefined) {
  return useQuery({
    queryKey: ["mine", mineId],
    queryFn: () => api.get<MineDetail>(`/mines/${mineId}`),
    enabled: !!mineId,
  });
}

export function useAdminMines(page: number) {
  return useQuery({
    queryKey: ["admin-own-mines", page],
    queryFn: () => api.get<Paginated<MineListItem>>(`/company/mines${toQueryString({ page, pageSize: 20 })}`),
  });
}

function toFormData(input: MineInput, images: File[]) {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("location", input.location);
  formData.append("rawMaterialType", input.rawMaterialType);
  formData.append("volume", input.volume);
  if (input.description) formData.append("description", input.description);
  images.forEach((file) => formData.append("images", file));
  return formData;
}

export function useCreateMine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: MineInput; images: File[] }) =>
      api.postForm<MineDetail>("/company/mines", toFormData(input, images)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-own-mines"] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
    },
  });
}

export function useDeleteMine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mineId: string) => api.delete(`/company/mines/${mineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-own-mines"] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
    },
  });
}
