import { useMemo } from "react";
import type { MineMapMarker } from "@/components/mines/MineMap";

type MineLike = {
  id: string;
  name: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
};

export function useMineMarkers(mines: MineLike[], withLinks = true): MineMapMarker[] {
  return useMemo(() => {
    const markers: MineMapMarker[] = [];
    for (const mine of mines) {
      if (
        mine.lat != null &&
        mine.lng != null &&
        Number.isFinite(mine.lat) &&
        Number.isFinite(mine.lng)
      ) {
        markers.push({
          id: mine.id,
          lat: mine.lat,
          lng: mine.lng,
          label: mine.name,
          href: withLinks ? `/mines/${mine.id}` : undefined,
        });
      }
    }
    return markers;
  }, [mines, withLinks]);
}
