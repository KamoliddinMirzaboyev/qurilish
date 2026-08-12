import { Suspense, useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import { LogoWithText } from "@/components/shared/Logo";
import { UserAvatar } from "@/components/ui/Avatar";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api";
import { PageLoader } from "@/routes/guards";
import clsx from "clsx";

interface NavItem {
  label: string;
  to: string;
  end?: boolean;
}

const navByRole: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Boshqaruv paneli", to: "/app/admin", end: true },
    { label: "Muammolarim", to: "/app/admin/problems" },
    { label: "Takliflar", to: "/app/admin/proposals" },
    { label: "Chiqindilarim", to: "/app/admin/waste" },
    { label: "Bog'lanishlar", to: "/app/connections" },
    { label: "Profil", to: "/app/profile" },
  ],
  USER: [
    { label: "Boshqaruv paneli", to: "/app/user", end: true },
    { label: "Muammolar banki", to: "/app/problems" },
    { label: "Takliflarim", to: "/app/user/proposals" },
    { label: "Bog'lanishlar", to: "/app/connections" },
    { label: "Profil", to: "/app/profile" },
  ],
  SUPERADMIN: [
    { label: "Boshqaruv paneli", to: "/superadmin", end: true },
    { label: "Firmalar", to: "/superadmin/admins" },
    { label: "Foydalanuvchilar", to: "/superadmin/users" },
    { label: "Muammolar", to: "/superadmin/problems" },
    { label: "Takliflar", to: "/superadmin/proposals" },
    { label: "Konlar", to: "/superadmin/mines" },
    { label: "Chiqindi", to: "/superadmin/waste" },
    { label: "Profil", to: "/app/profile" },
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
              "rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
              isActive ? "bg-brand-primary/10 text-brand-primary" : "text-ink-muted hover:bg-slate-100 hover:text-ink"
            )
          }
        >
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

  if (!user) return null;
  const items = navByRole[user.role] ?? [];

  async function handleLogout() {
    setUserMenuOpen(false);
    await api.post("/auth/logout");
    setUser(null);
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-surface-page">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-surface-border bg-white p-5 md:flex">
        <Link to="/" className="mb-8">
          <LogoWithText size={26} />
        </Link>
        <NavLinks items={items} />
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-danger hover:bg-red-50"
        >
          <LogOut size={16} /> Chiqish
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-white px-4 md:justify-end">
          <button className="text-ink md:hidden" onClick={() => setDrawerOpen(true)} aria-label="Menyuni ochish">
            <Menu size={24} />
          </button>

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

        <main className="flex-1 p-4 sm:p-6">
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
