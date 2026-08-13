import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppNotification, NotificationFeed } from "@buildscience/shared";
import { api, API_BASE } from "@/lib/api";
import { notify } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/AuthContext";

export function useNotificationFeed() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationFeed>("/notifications"),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ updated: boolean }>("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useNotificationStream() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const url = `${API_BASE}/notifications/stream`;
    const source = new EventSource(url, { withCredentials: true });

    source.addEventListener("notification", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as AppNotification;
      notify.info(data.title);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => source.close();
  }, [user, queryClient]);
}
