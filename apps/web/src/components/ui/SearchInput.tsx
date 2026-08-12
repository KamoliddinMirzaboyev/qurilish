import { Children, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { Input } from "./Input";

export function SearchInput({
  value,
  onChange,
  placeholder = "Qidirish",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-10" />
    </div>
  );
}

/** Har bir filtr elementi (Select/Button) `w-full` ishlatadi — flex-row ichida cheklovsiz qoldirilsa,
 * flex-basis butun qatorni egallab, boshqalarni pastga suradi. Shu wrapper kenglikni cheklaydi. */
function FilterItem({ children }: { children: React.ReactNode }) {
  return <div className="sm:w-auto sm:min-w-[9.5rem] sm:flex-none">{children}</div>;
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, ...rest] = Children.toArray(children);
  const hasFilters = rest.length > 0;

  return (
    <div className="rounded-card border border-surface-border bg-white p-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        {search}

        {hasFilters && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-surface-border px-3.5 text-sm font-medium text-ink transition-colors hover:border-brand-primary hover:text-brand-primary sm:hidden"
          >
            <SlidersHorizontal size={16} />
            Filtrlar
            <ChevronDown size={16} className={clsx("transition-transform duration-200", open && "rotate-180")} />
          </button>
        )}

        {hasFilters && (
          <div className="hidden sm:contents">
            {rest.map((child, i) => (
              <FilterItem key={i}>{child}</FilterItem>
            ))}
          </div>
        )}
      </div>

      {hasFilters && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden sm:hidden"
            >
              <div className="mt-2.5 flex flex-col gap-2.5">{rest}</div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
