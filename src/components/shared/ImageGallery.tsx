import * as React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, Download, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  className?: string;
  /** Tile size: small for inline, normal for views */
  size?: 'sm' | 'md' | 'lg';
  emptyLabel?: string;
}

export function ImageGallery({ images, className, size = 'md', emptyLabel = 'No images attached' }: ImageGalleryProps) {
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);

  const cleaned = React.useMemo(() => (images || []).filter(Boolean), [images]);

  const sizeClasses = size === 'sm' ? 'aspect-square' : size === 'lg' ? 'aspect-[4/3]' : 'aspect-square';

  if (cleaned.length === 0) {
    return (
      <div className={cn('text-center text-xs text-muted-foreground py-6 border border-dashed border-border/60 rounded-lg', className)}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-2',
          size === 'sm' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
          className,
        )}
      >
        {cleaned.map((url, i) => (
          <button
            key={url + i}
            type="button"
            onClick={() => setOpenIdx(i)}
            className={cn(
              'relative group rounded-lg overflow-hidden border border-border/60 bg-muted shadow-sm hover:shadow-md transition-all',
              sizeClasses,
            )}
          >
            <img src={url} alt={`Image ${i + 1}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {cleaned.length > 1 && (
              <span className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {i + 1}/{cleaned.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <Dialog open={openIdx !== null} onOpenChange={(o) => !o && setOpenIdx(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          {openIdx !== null && (
            <Lightbox
              images={cleaned}
              startIdx={openIdx}
              onClose={() => setOpenIdx(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Lightbox({ images, startIdx, onClose }: { images: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = React.useState(startIdx);

  const next = React.useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);
  const prev = React.useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  const url = images[idx];
  return (
    <div className="relative w-full h-[70vh] flex items-center justify-center select-none">
      <img src={url} alt="" className="max-w-full max-h-full object-contain" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <a
          href={url}
          download
          target="_blank"
          rel="noreferrer"
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          {idx + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
