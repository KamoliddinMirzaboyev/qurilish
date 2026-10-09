import { Link } from "react-router-dom";
import { Factory } from "lucide-react";
import type { WasteListItem } from "@buildscience/shared";
import { Card } from "@/components/ui/Card";
import { ImageSlider } from "@/components/ui/ImageSlider";

export function WasteCard({ waste }: { waste: WasteListItem }) {
  const slides = waste.imageUrls?.length ? waste.imageUrls : waste.coverImageUrl ? [waste.coverImageUrl] : [];

  return (
    <Link to={`/waste/${waste.id}`}>
      <Card className="flex h-full flex-col gap-3 transition-shadow hover:shadow-md">
        <ImageSlider images={slides} alt={waste.factoryName} className="aspect-video rounded-lg" />
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
