import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageGallery } from '@/components/shared/ImageGallery';
import { Eye, Image as ImageIcon } from 'lucide-react';

interface RecordImageGalleryProps {
  /** Both `image_url` and `images[]` may be present; this component handles both. */
  primary?: string | null;
  images?: string[] | null;
  emptyLabel?: string;
  /** Optional title for the lightbox dialog. */
  title?: string;
}

/**
 * Compact "View" button that opens a lightbox showing ALL images for a
 * prescription / x-ray record. Use anywhere a record row needs to expose
 * its multiple images in one click.
 */
export function RecordImageGallery({ primary, images, emptyLabel = 'No image', title = 'Record Images' }: RecordImageGalleryProps) {
  const all = React.useMemo(() => {
    const list: string[] = [];
    if (primary) list.push(primary);
    for (const u of images || []) {
      if (u && !list.includes(u)) list.push(u);
    }
    return list;
  }, [primary, images]);
  const [open, setOpen] = React.useState(false);

  if (all.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5" />
        <span>View</span>
        {all.length > 1 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-secondary/15 text-secondary text-[10px] font-semibold">
            {all.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> {title}
              {all.length > 1 && <span className="text-xs font-normal text-muted-foreground">({all.length} images)</span>}
            </DialogTitle>
          </DialogHeader>
          <ImageGallery images={all} size="md" />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Variant for inline thumbnail strip in patient detail dialogs */
export function RecordImageStrip({ primary, images, emptyLabel = 'No images attached' }: RecordImageGalleryProps) {
  const all = React.useMemo(() => {
    const list: string[] = [];
    if (primary) list.push(primary);
    for (const u of images || []) {
      if (u && !list.includes(u)) list.push(u);
    }
    return list;
  }, [primary, images]);
  return <ImageGallery images={all} size="sm" emptyLabel={emptyLabel} />;
}
