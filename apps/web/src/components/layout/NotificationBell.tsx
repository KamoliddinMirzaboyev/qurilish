import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotificationFeed, useMarkAllNotificationsRead, useMarkNotificationRead } from "@/features/notifications/hooks";
import { formatRelative } from "@/lib/format";
import clsx from "clsx";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data } = useNotificationFeed();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-ink hover:bg-slate-100"
        aria-label="Bildirishnomalar"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-surface-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
            <p className="text-sm font-semibold text-ink">Bildirishnomalar</p>
            {unread > 0 && (
              <button type="button" onClick={() => markAll.mutate()} className="text-xs font-medium text-brand-primary">
                Barchasini o'qilgan
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-muted">Hozircha bildirishnoma yo'q.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.readAt) markOne.mutate(n.id);
                    setOpen(false);
                    if (n.link) navigate(n.link);
                  }}
                  className={clsx(
                    "flex w-full flex-col gap-0.5 border-b border-surface-border px-3 py-2.5 text-left last:border-0 hover:bg-slate-50",
                    !n.readAt && "bg-brand-primary/5"
                  )}
                >
                  <span className="text-sm font-medium text-ink">{n.title}</span>
                  <span className="line-clamp-2 text-xs text-ink-muted">{n.body}</span>
                  <span className="text-[11px] text-ink-muted">{formatRelative(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
