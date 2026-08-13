import { useParams } from "react-router-dom";
import { Factory } from "lucide-react";
import { useWaste } from "@/features/waste/hooks";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card, ErrorState, LoadingSkeleton } from "@/components/ui/Card";

export default function WasteDetailPage() {
  const { wasteId } = useParams();
  const { data: waste, isLoading, isError, refetch } = useWaste(wasteId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-10">
        <LoadingSkeleton className="h-8 w-2/3" />
        <LoadingSkeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (isError || !waste) {
    return (
      <div className="mx-auto max-w-content px-4 py-10">
        <ErrorState title="Chiqindi e'loni topilmadi." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10">
      <Breadcrumb items={[{ label: "Chiqindi", to: "/waste" }, { label: waste.factoryName }]} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {(waste.images ?? []).length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(waste.images ?? []).map((img) => (
                <div key={img.id} className="aspect-square overflow-hidden rounded-lg bg-surface-muted">
                  <img src={img.url} alt={waste.factoryName} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-surface-muted text-sm text-ink-muted">
              Rasm yo'q
            </div>
          )}

          <Card className="flex flex-col gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-brand-dark">
              <Factory size={20} /> {waste.factoryName}
            </h1>
            <div>
              <p className="text-sm text-ink-muted">Tarkibi</p>
              <p className="text-sm leading-relaxed text-ink">{waste.composition}</p>
            </div>
            {waste.description && (
              <div>
                <p className="text-sm text-ink-muted">Qo'shimcha ma'lumot</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{waste.description}</p>
              </div>
            )}
          </Card>
        </div>

        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-ink-muted">Hajm</p>
            <p className="text-lg font-semibold text-brand-dark">{waste.volume}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Yillik hajm</p>
            <p className="text-lg font-semibold text-brand-dark">{waste.annualVolume}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">E'lon beruvchi</p>
            <p className="text-sm font-medium text-ink">{waste.adminName}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
