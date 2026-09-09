import { Suspense, useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  FileText,
  Mountain,
  Recycle,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { LogoWithText } from "@/components/shared/Logo";
import { UserAvatar } from "@/components/ui/Avatar";
import { useAuth } from "@/features/auth/AuthContext";
import { logoutClient } from "@/lib/session";
import { PageLoader } from "@/routes/guards";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useNotificationStream } from "@/features/notifications/hooks";
import clsx from "clsx";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const navByRole: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Boshqaruv paneli", to: "/app/admin", icon: LayoutDashboard, end: true },
    { label: "Muammolarim", to: "/app/admin/problems", icon: ClipboardList },
    { label: "Takliflar", to: "/app/admin/proposals", icon: FileText },
    { label: "Konlarim", to: "/app/admin/mines", icon: Mountain },
    { label: "Chiqindilarim", to: "/app/admin/waste", icon: Recycle },
    { label: "Bog'lanishlar", to: "/app/connections", icon: Handshake },
    { label: "Profil", to: "/app/profile", icon: User },
  ],
  USER: [
    { label: "Boshqaruv paneli", to: "/app/user", icon: LayoutDashboard, end: true },
    { label: "Muammolar banki", to: "/app/problems", icon: ClipboardList },
    { label: "Takliflarim", to: "/app/user/proposals", icon: FileText },
    { label: "Bog'lanishlar", to: "/app/connections", icon: Handshake },
    { label: "Profil", to: "/app/profile", icon: User },
  ],
  SUPERADMIN: [
    { label: "Boshqaruv paneli", to: "/superadmin", icon: LayoutDashboard, end: true },
    { label: "Firmalar", to: "/superadmin/admins", icon: Building2 },
    { label: "Foydalanuvchilar", to: "/superadmin/users", icon: Users },
    { label: "Muammolar", to: "/superadmin/problems", icon: ClipboardList },
    { label: "Takliflar", to: "/superadmin/proposals", icon: FileText },
    { label: "Konlar", to: "/superadmin/mines", icon: Mountain },
    { label: "Chiqindi", to: "/superadmin/waste", icon: Recycle },
    { label: "Profil", to: "/app/profile", icon: User },
  ],
};

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
              isActive ? "bg-brand-primary text-white" : "text-ink-muted hover:bg-slate-100 hover:text-ink"
            )
          }
        >
          <item.icon size={16} className="shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShellLayout() {
  const { user, setUser } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useNotificationStream();
  if (!user) return null;
  const items = navByRole[user.role] ?? [];

  async function handleLogout() {
    setUserMenuOpen(false);
    await logoutClient();
    setUser(null);
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-surface-page">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-surface-border bg-white p-3 md:flex">
        <Link to="/" className="mb-5 px-1">
          <LogoWithText size={24} />
        </Link>
        <NavLinks items={items} />
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-red-50"
        >
          <LogOut size={16} /> Chiqish
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-border bg-white px-4 md:justify-end">
          <button className="text-ink md:hidden" onClick={() => setDrawerOpen(true)} aria-label="Menyuni ochish">
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-1">
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-3 transition-colors hover:bg-slate-100"
            >
              <UserAvatar name={user.name} size={34} />
              <span className="hidden text-sm font-medium text-ink md:block">{user.name}</span>
              <ChevronDown size={16} className={clsx("hidden text-ink-muted transition-transform md:block", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-surface-border bg-white shadow-lg">
                <div className="border-b border-surface-border px-4 py-3">
                  <p className="text-sm font-semibold text-ink">{user.name}</p>
                  <p className="text-xs text-ink-muted">{user.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate("/app/profile"); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-slate-100"
                  >
                    <User size={16} /> Profil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-red-50"
                  >
                    <LogOut size={16} /> Chiqish
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </header>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-hidden />
            <div className="absolute left-0 top-0 h-full w-72 bg-white p-5 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <LogoWithText size={26} />
                <button onClick={() => setDrawerOpen(false)} aria-label="Yopish">
                  <X size={22} />
                </button>
              </div>
              <NavLinks items={items} onNavigate={() => setDrawerOpen(false)} />
              <button
                onClick={handleLogout}
                className="mt-6 flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-danger hover:bg-red-50"
              >
                <LogOut size={16} /> Chiqish
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-4">
          <div className="mx-auto max-w-content">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
