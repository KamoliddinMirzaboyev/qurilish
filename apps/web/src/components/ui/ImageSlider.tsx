import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";

export function ImageSlider({ images, alt, className }: { images: string[]; alt: string; className?: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
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
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div className={clsx("relative overflow-hidden bg-surface-muted", className)}>
      <AnimatePresence initial={false} mode="wait">
        <motion.img
          key={index}
          src={images[index]}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="h-full w-full object-cover"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => go(e, -1)}
            aria-label="Oldingi rasm"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => go(e, 1)}
            aria-label="Keyingi rasm"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={clsx("h-1.5 w-1.5 rounded-full transition-colors", i === index ? "bg-white" : "bg-white/50")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
