import type { ConnectionCompanyView, ConnectionScientistView } from "@buildscience/shared";
import { useAuth } from "@/features/auth/AuthContext";
import { useConnections } from "@/features/connections/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, CardGridSkeleton } from "@/components/ui/Card";
import { ConnectionCard } from "@/components/shared/ConnectionCard";

export default function ConnectionsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useConnections<ConnectionCompanyView | ConnectionScientistView>();

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bog'lanishlar" />

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : items.length === 0 ? (
        <EmptyState title="Hozircha qabul qilingan takliflar mavjud emas." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) =>
            user?.role === "ADMIN" ? (
              <ConnectionCard
                key={(item as ConnectionCompanyView).proposalId}
                problemId={item.problemId}
                problemTitle={item.problemTitle}
                contactName={(item as ConnectionCompanyView).scientistName}
                contactSubtitle={[
                  (item as ConnectionCompanyView).specialization,
                  (item as ConnectionCompanyView).organization,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                email={(item as ConnectionCompanyView).scientistEmail}
                phone={(item as ConnectionCompanyView).scientistPhone}
                acceptedAt={item.acceptedAt}
              />
            ) : (
              <ConnectionCard
                key={(item as ConnectionScientistView).proposalId}
                problemId={item.problemId}
                problemTitle={item.problemTitle}
                contactName={(item as ConnectionScientistView).companyName}
                email={(item as ConnectionScientistView).companyEmail}
                phone={(item as ConnectionScientistView).companyPhone}
                acceptedAt={item.acceptedAt}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
