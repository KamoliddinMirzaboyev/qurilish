import { useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useMine } from "@/features/mines/hooks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card, ErrorState } from "@/components/ui/Card";
import { DetailSkeleton } from "@/components/ui/Skeleton";
import { ImageSlider } from "@/components/ui/ImageSlider";

export default function MineDetailPage() {
  const { mineId } = useParams();
  const { data: mine, isLoading, isError, refetch } = useMine(mineId);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !mine) {
    return (
      <div className="mx-auto max-w-content px-4 py-10">
        <ErrorState title="Kon topilmadi." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <Breadcrumb items={[{ label: "Konlar", to: "/mines" }, { label: mine.name }]} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ImageSlider
            images={(mine.images ?? []).map((img) => img.url)}
            alt={mine.name}
            thumbs
            className="aspect-[16/10] min-h-[240px] rounded-lg sm:min-h-[360px]"
          />

          <Card className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold text-brand-dark">{mine.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-ink-muted">
              <MapPin size={16} /> {mine.location}
            </p>
            {mine.description && <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{mine.description}</p>}
          </Card>
        </div>

        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-ink-muted">Xomashyo turi</p>
            <p className="text-lg font-semibold text-brand-dark">{mine.rawMaterialType}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Hajm</p>
            <p className="text-lg font-semibold text-brand-dark">{mine.volume}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">E'lon beruvchi</p>
            <p className="text-sm font-medium text-ink">{mine.adminName}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
