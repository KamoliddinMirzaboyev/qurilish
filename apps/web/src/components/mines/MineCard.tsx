import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { MineListItem } from "@buildscience/shared";
import { Card } from "@/components/ui/Card";
import { ImageSlider } from "@/components/ui/ImageSlider";

export function MineCard({ mine }: { mine: MineListItem }) {
  const slides = mine.imageUrls?.length ? mine.imageUrls : mine.coverImageUrl ? [mine.coverImageUrl] : [];

  return (
    <Link to={`/mines/${mine.id}`}>
      <Card className="flex h-full flex-col gap-3 transition-shadow hover:shadow-md">
        <ImageSlider images={slides} alt={mine.name} className="aspect-video rounded-lg" />
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
