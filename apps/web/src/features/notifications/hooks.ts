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
    let source: EventSource | null = null;
    let closed = false;
    let retry = 0;
    let timer: number | undefined;

    function connect() {
      if (closed) return;
      source = new EventSource(url, { withCredentials: true });
      source.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as AppNotification;
          notify.info(data.title);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        } catch {
          // noto'g'ri SSE payload
        }
      });
      source.onerror = () => {
        source?.close();
        retry = Math.min(retry + 1, 6);
        timer = window.setTimeout(connect, 1000 * 2 ** retry);
      };
    }

    connect();
    return () => {
      closed = true;
      if (timer) window.clearTimeout(timer);
      source?.close();
    };
  }, [user, queryClient]);
}
