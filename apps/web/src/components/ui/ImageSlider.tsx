import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";

export function ImageSlider({
  images,
  alt,
  className,
  thumbs = false,
}: {
  images: string[];
  alt: string;
  className?: string;
  thumbs?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const safeImages = images.filter(Boolean);

  if (safeImages.length === 0) {
    return (
      <div className={clsx("flex flex-col items-center justify-center gap-1 bg-surface-muted text-ink-muted", className)}>
        <ImageOff size={20} aria-hidden />
        <span className="text-xs">Rasm yo'q</span>
      </div>
    );
  }

  function go(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + safeImages.length) % safeImages.length);
  }

  function jump(e: React.MouseEvent, next: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={clsx("relative overflow-hidden bg-surface-muted", className)}>
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={index}
            src={safeImages[index]}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full w-full object-cover"
          />
        </AnimatePresence>

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => go(e, -1)}
              aria-label="Oldingi rasm"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => go(e, 1)}
              aria-label="Keyingi rasm"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {safeImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Rasm ${i + 1}`}
                  onClick={(e) => jump(e, i)}
                  className={clsx("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/50")}
                />
              ))}
            </div>
            <span className="absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
              {index + 1}/{safeImages.length}
            </span>
          </>
        )}
      </div>

      {thumbs && safeImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {safeImages.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={(e) => jump(e, i)}
              aria-label={`${alt} ${i + 1}`}
              className={clsx(
                "h-16 w-20 shrink-0 overflow-hidden rounded-md border-2",
                i === index ? "border-brand-primary" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
