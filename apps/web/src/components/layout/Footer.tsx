import { Link } from "react-router-dom";
import { LogoWithText } from "@/components/shared/Logo";

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-white">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <LogoWithText />
          <p className="mt-3 text-sm text-ink-muted">
            BuildScience qurilish korxonalari va olimlarni bir platformada bog'laydi.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          <Link to="/problems" className="text-ink-muted hover:text-ink">
            Muammolar
          </Link>
          <Link to="/mines" className="text-ink-muted hover:text-ink">
            Konlar
          </Link>
          <Link to="/waste" className="text-ink-muted hover:text-ink">
            Chiqindi
          </Link>
          <Link to="/#how-it-works" className="text-ink-muted hover:text-ink">
            Qanday ishlaydi
          </Link>
          <Link to="/login" className="text-ink-muted hover:text-ink">
            Kirish
          </Link>
          <Link to="/register" className="text-ink-muted hover:text-ink">
            Ro'yxatdan o'tish
          </Link>
        </nav>
      </div>
      <div className="border-t border-surface-border px-4 py-5">
        <div className="mx-auto max-w-content text-xs text-ink-muted">
          <p>© {new Date().getFullYear()} BuildScience. Barcha huquqlar himoyalangan.</p>
          <p className="mt-1">
            BuildScience tomonlarni bog'lash uchun xizmat qiladi. Shartnoma, to'lov va loyiha ijrosi platformadan tashqarida
            amalga oshiriladi.
          </p>
        </div>
      </div>
    </footer>
  );
}
