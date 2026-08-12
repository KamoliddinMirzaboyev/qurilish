import { useRef } from "react";
import { Paperclip, X, FileText } from "lucide-react";
import { IconButton } from "./Button";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-surface-border bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-ink">
          <FileText size={18} className="text-brand-primary" aria-hidden />
          <span className="truncate">{file.name}</span>
          <span className="text-ink-muted">({formatSize(file.size)})</span>
        </div>
        <IconButton label="Faylni olib tashlash" onClick={() => onChange(null)}>
          <X size={16} />
        </IconButton>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border bg-white px-4 py-4 text-sm text-ink-muted hover:border-brand-primary hover:text-brand-primary"
      >
        <Paperclip size={18} aria-hidden />
        Fayl biriktirish
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <p className="mt-1.5 text-sm text-ink-muted">PDF, JPG yoki PNG. Maksimal hajm: 10 MB.</p>
    </div>
  );
}
