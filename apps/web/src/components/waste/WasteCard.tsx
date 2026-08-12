import { Link } from "react-router-dom";
import { Factory } from "lucide-react";
import type { WasteListItem } from "@buildscience/shared";
import { Card } from "@/components/ui/Card";

export function WasteCard({ waste }: { waste: WasteListItem }) {
  return (
    <Link to={`/waste/${waste.id}`}>
      <Card className="flex h-full flex-col gap-3 transition-shadow hover:shadow-md">
        <div className="aspect-video overflow-hidden rounded-xl bg-surface-muted">
          {waste.coverImageUrl ? (
            <img src={waste.coverImageUrl} alt={waste.factoryName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-muted">Rasm yo'q</div>
          )}
        </div>
        <h3 className="flex items-center gap-1.5 font-semibold text-brand-dark">
          <Factory size={16} /> {waste.factoryName}
        </h3>
        <p className="line-clamp-2 text-sm text-ink-muted">{waste.composition}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="font-medium text-brand-primary">{waste.volume}</span>
          <span>{waste.annualVolume}</span>
        </div>
      </Card>
    </Link>
  );
}
