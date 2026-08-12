import clsx from "clsx";

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150",
            value === tab.value ? "bg-white text-brand-primary shadow-sm" : "text-ink-muted hover:text-ink"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
