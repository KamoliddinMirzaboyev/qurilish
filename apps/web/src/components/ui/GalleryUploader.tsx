import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { GALLERY_UPLOAD } from "@buildscience/shared";
import { IconButton } from "./Button";

export function GalleryUploader({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)].slice(0, GALLERY_UPLOAD.MAX_IMAGES);
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {previews.map((src, i) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-surface-border">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <IconButton
              label="Rasmni olib tashlash"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 bg-white/90"
            >
              <X size={14} />
            </IconButton>
          </div>
        ))}
        {files.length < GALLERY_UPLOAD.MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-white text-ink-muted hover:border-brand-primary hover:text-brand-primary"
          >
            <Plus size={20} aria-hidden />
            <span className="text-xs">Rasm qo'shish</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="mt-1.5 text-sm text-ink-muted">JPG yoki PNG, maksimal {GALLERY_UPLOAD.MAX_IMAGES} ta rasm, har biri 10 MB gacha.</p>
    </div>
  );
}
