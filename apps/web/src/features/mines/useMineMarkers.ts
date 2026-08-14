import { useEffect, useRef, useState } from "react";
import { geocodeLocation } from "@/lib/geocode";
import type { MineMapMarker } from "@/components/mines/MineMap";

type MineLike = {
  id: string;
  name: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
};

export function useMineMarkers(mines: MineLike[], withLinks = true) {
  const [markers, setMarkers] = useState<MineMapMarker[]>([]);
  const minesRef = useRef(mines);
  minesRef.current = mines;
  const key = mines.map((m) => `${m.id}:${m.lat ?? ""}:${m.lng ?? ""}:${m.location}`).join("|");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const next: MineMapMarker[] = [];
      for (const mine of minesRef.current) {
        let lat = mine.lat ?? null;
        let lng = mine.lng ?? null;
        if (lat == null || lng == null) {
          const geo = await geocodeLocation(mine.location);
          if (cancelled) return;
          lat = geo?.lat ?? null;
          lng = geo?.lng ?? null;
        }
        if (lat == null || lng == null) continue;
        next.push({
          id: mine.id,
          lat,
          lng,
          label: mine.name,
          href: withLinks ? `/mines/${mine.id}` : undefined,
        });
      }
      if (!cancelled) setMarkers(next);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [key, withLinks]);

  return markers;
}
