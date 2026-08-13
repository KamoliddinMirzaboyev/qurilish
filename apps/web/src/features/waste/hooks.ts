import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WasteDetail, WasteInput, WasteListItem, Paginated } from "@buildscience/shared";
import { api } from "@/lib/api";
import { toQueryString } from "@/lib/query";

export function useWasteList(filters: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["waste", filters],
    queryFn: () => api.get<Paginated<WasteListItem>>(`/waste${toQueryString(filters)}`),
  });
}

export function useWaste(wasteId: string | undefined) {
  return useQuery({
    queryKey: ["waste-item", wasteId],
    queryFn: () => api.get<WasteDetail>(`/waste/${wasteId}`),
    enabled: !!wasteId,
  });
}

export function useAdminWaste(page: number) {
  return useQuery({
    queryKey: ["admin-own-waste", page],
    queryFn: () => api.get<Paginated<WasteListItem>>(`/company/waste${toQueryString({ page, pageSize: 20 })}`),
  });
}

function toFormData(input: WasteInput, images: File[]) {
  const formData = new FormData();
  formData.append("factoryName", input.factoryName);
  formData.append("composition", input.composition);
  formData.append("volume", input.volume);
  formData.append("annualVolume", input.annualVolume);
  if (input.description) formData.append("description", input.description);
  images.forEach((file) => formData.append("images", file));
  return formData;
}

export function useCreateWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: WasteInput; images: File[] }) =>
      api.postForm<WasteDetail>("/company/waste", toFormData(input, images)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-own-waste"] });
      queryClient.invalidateQueries({ queryKey: ["waste"] });
    },
  });
}

export function useUpdateWaste(wasteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: WasteInput; images: File[] }) =>
      api.patchForm<WasteDetail>(`/company/waste/${wasteId}`, toFormData(input, images)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-own-waste"] });
      queryClient.invalidateQueries({ queryKey: ["waste"] });
      queryClient.invalidateQueries({ queryKey: ["waste-item", wasteId] });
    },
  });
}

export function useDeleteWasteImage(wasteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.delete(`/company/waste/${wasteId}/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waste-item", wasteId] });
      queryClient.invalidateQueries({ queryKey: ["waste"] });
    },
  });
}

export function useDeleteWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (wasteId: string) => api.delete(`/company/waste/${wasteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-own-waste"] });
      queryClient.invalidateQueries({ queryKey: ["waste"] });
    },
  });
}
