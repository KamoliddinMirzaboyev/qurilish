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

function toFormData(input: MineInput, images: File[]) {
  const formData = new FormData();
  formData.append("name", input.name);
  formData.append("location", input.location);
  formData.append("rawMaterialType", input.rawMaterialType);
  formData.append("volume", input.volume);
  if (input.description) formData.append("description", input.description);
  if (input.lat != null) formData.append("lat", String(input.lat));
  if (input.lng != null) formData.append("lng", String(input.lng));
  images.forEach((file) => formData.append("images", file));
  return formData;
}

export type MineScope = "admin" | "company";

function mineBase(scope: MineScope) {
  return scope === "company" ? "/company/mines" : "/admin/mines";
}

export function useAdminOwnMines(page: number) {
  return useQuery({
    queryKey: ["admin-own-mines", page],
    queryFn: () => api.get<Paginated<MineDetail>>(`/company/mines${toQueryString({ page, pageSize: 20 })}`),
  });
}

export function useCreateMine(scope: MineScope = "admin") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: MineInput; images: File[] }) =>
      api.postForm<MineDetail>(mineBase(scope), toFormData(input, images)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mines-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["admin-own-mines"] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
    },
  });
}

export function useUpdateMine(mineId: string, scope: MineScope = "admin") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: MineInput; images: File[] }) =>
      api.patchForm<MineDetail>(`${mineBase(scope)}/${mineId}`, toFormData(input, images)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mines-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["admin-own-mines"] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
      queryClient.invalidateQueries({ queryKey: ["mine", mineId] });
    },
  });
}

export function useDeleteMineImage(mineId: string, scope: MineScope = "admin") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.delete(`${mineBase(scope)}/${mineId}/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mine", mineId] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
    },
  });
}

export function useDeleteOwnMine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mineId: string) => api.delete(`/company/mines/${mineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-own-mines"] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
    },
  });
}
