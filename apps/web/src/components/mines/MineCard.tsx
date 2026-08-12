import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { MineListItem } from "@buildscience/shared";
import { Card } from "@/components/ui/Card";

export function MineCard({ mine }: { mine: MineListItem }) {
  return (
    <Link to={`/mines/${mine.id}`}>
      <Card className="flex h-full flex-col gap-3 transition-shadow hover:shadow-md">
        <div className="aspect-video overflow-hidden rounded-lg bg-surface-muted">
          {mine.coverImageUrl ? (
            <img src={mine.coverImageUrl} alt={mine.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">Rasm yo'q</div>
          )}
        </div>
        <h3 className="font-semibold text-brand-dark">{mine.name}</h3>
        <p className="flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin size={14} /> {mine.location}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="font-medium text-brand-primary">{mine.rawMaterialType}</span>
          <span>{mine.volume}</span>
        </div>
      </Card>
    </Link>
  );
}
