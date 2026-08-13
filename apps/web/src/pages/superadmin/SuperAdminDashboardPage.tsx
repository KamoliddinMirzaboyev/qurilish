import { Users, Building2, AlertCircle, FileText, CheckCircle, Ban, Mountain, Recycle } from "lucide-react";
import { useAdminStats } from "@/features/admin/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/Card";
import { StatsSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Hokimiyat paneli" />

      {isLoading || !stats ? (
        <StatsSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Foydalanuvchilar" value={stats.totalUsers} icon={<Users size={20} />} color="brand" />
          <StatCard label="Firmalar" value={stats.totalAdmins} icon={<Building2 size={20} />} color="amber" />
          <StatCard label="Ochiq muammolar" value={stats.openProblems} icon={<AlertCircle size={20} />} color="brand" />
          <StatCard label="Jami takliflar" value={stats.totalProposals} icon={<FileText size={20} />} color="amber" />
          <StatCard label="Tanlangan takliflar" value={stats.acceptedProposals} icon={<CheckCircle size={20} />} color="green" />
          <StatCard label="Bloklangan foydalanuvchilar" value={stats.blockedUsers} icon={<Ban size={20} />} color="red" />
          <StatCard label="Konlar" value={stats.totalMines} icon={<Mountain size={20} />} color="green" />
          <StatCard label="Chiqindi e'lonlari" value={stats.totalWaste} icon={<Recycle size={20} />} color="brand" />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asLink to="/superadmin/admins" variant="outline">
          Firmalarni boshqarish
        </Button>
        <Button asLink to="/superadmin/users" variant="outline">
          Foydalanuvchilarni ko'rish
        </Button>
        <Button asLink to="/superadmin/problems" variant="outline">
          Muammolarni ko'rish
        </Button>
        <Button asLink to="/superadmin/proposals" variant="outline">
          Takliflarni ko'rish
        </Button>
        <Button asLink to="/superadmin/mines" variant="outline">
          Konlarni ko'rish
        </Button>
        <Button asLink to="/superadmin/waste" variant="outline">
          Chiqindini ko'rish
        </Button>
      </div>
    </div>
  );
}
