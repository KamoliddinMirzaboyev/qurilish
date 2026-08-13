import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { LogoWithText } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/ui/Avatar";
import { DropdownMenu, MenuItem } from "@/components/ui/Menu";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api";
import { dashboardPathForRole } from "@/routes/paths";

const navLinks = [
  { label: "Bosh sahifa", to: "/" },
  { label: "Muammolar", to: "/problems" },
  { label: "Konlar", to: "/mines" },
  { label: "Chiqindi", to: "/waste" },
  { label: "Qanday ishlaydi", to: "/#how-it-works" },
  { label: "Platforma haqida", to: "/#boundaries" },
];

export function Header() {
  const { user, setUser } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post("/auth/logout");
    setUser(null);
    navigate("/");
  }

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4">
        <Link to="/">
          <LogoWithText />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm font-medium text-ink-muted hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <DropdownMenu trigger={<UserAvatar name={user.name} size={38} />}>
              <MenuItem onClick={() => navigate(dashboardPathForRole(user.role))}>
                <LayoutDashboard size={16} /> Boshqaruv paneli
              </MenuItem>
              <MenuItem onClick={handleLogout} danger>
                <LogOut size={16} /> Chiqish
              </MenuItem>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-ink hover:text-brand-primary">
                Kirish
              </Link>
              <Button size="sm" onClick={() => navigate("/register")}>
                Ro'yxatdan o'tish
              </Button>
            </>
          )}
        </div>

        <button
          className="text-ink md:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Menyuni ochish"
        >
          <Menu size={24} />
        </button>
      </div>
    </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <LogoWithText size={26} />
              <button onClick={() => setDrawerOpen(false)} aria-label="Yopish">
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} className="text-sm font-medium text-ink" onClick={() => setDrawerOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-3 border-t border-surface-border pt-6">
              {user ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate(dashboardPathForRole(user.role));
                    }}
                  >
                    Boshqaruv paneli
                  </Button>
                  <Button variant="ghost" onClick={handleLogout}>
                    Chiqish
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setDrawerOpen(false)} className="text-center text-sm font-medium text-ink">
                    Kirish
                  </Link>
                  <Button
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate("/register");
                    }}
                  >
                    Ro'yxatdan o'tish
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
