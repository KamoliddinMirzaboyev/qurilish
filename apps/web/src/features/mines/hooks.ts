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
  images.forEach((file) => formData.append("images", file));
  return formData;
}

/** SUPERADMIN — /admin/mines orqali yangi kon joylashtiradi. */
export function useCreateMine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: MineInput; images: File[] }) =>
      api.postForm<MineDetail>("/admin/mines", toFormData(input, images)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mines-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
    },
  });
}

/** SUPERADMIN — mavjud konni tahrirlaydi, yangi rasmlarni qo'shimcha qiladi. */
export function useUpdateMine(mineId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, images }: { input: MineInput; images: File[] }) =>
      api.patchForm<MineDetail>(`/admin/mines/${mineId}`, toFormData(input, images)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-mines-moderation"] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
      queryClient.invalidateQueries({ queryKey: ["mine", mineId] });
    },
  });
}

export function useDeleteMineImage(mineId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.delete(`/admin/mines/${mineId}/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mine", mineId] });
      queryClient.invalidateQueries({ queryKey: ["mines"] });
    },
  });
}
