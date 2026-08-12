import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

export function DropdownMenu({
  trigger,
  children,
  align = "right",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute z-20 mt-2 min-w-[180px] rounded-lg border border-surface-border bg-white p-1.5 shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, danger }: { children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100",
        danger ? "text-danger" : "text-ink"
      )}
    >
      {children}
    </button>
  );
}
