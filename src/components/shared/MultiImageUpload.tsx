import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PickedFile {
  id: string;
  file: File;
  url: string; // local preview blob URL
}

interface MultiImageUploadProps {
  value: PickedFile[];
  onChange: (next: PickedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
  label?: string;
  /** Existing remote images to display alongside (read-only). */
  existingUrls?: string[];
  onRemoveExisting?: (url: string) => void;
}

export const MultiImageUpload = React.memo(function MultiImageUpload({
  value,
  onChange,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = 'image/*',
  className,
  label = 'Drag images here or click to upload',
  existingUrls = [],
  onRemoveExisting,
}: MultiImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const addFiles = React.useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list);
    const remaining = maxFiles - value.length - existingUrls.length;
    if (remaining <= 0) return;
    const sliced = incoming.slice(0, remaining);
    const next: PickedFile[] = [];
    for (const file of sliced) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > maxSizeMB * 1024 * 1024) continue;
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
      });
    }
    if (next.length > 0) onChange([...value, ...next]);
  }, [value, onChange, maxFiles, maxSizeMB, existingUrls.length]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const remove = (id: string) => {
    const target = value.find(v => v.id === id);
    if (target) URL.revokeObjectURL(target.url);
    onChange(value.filter(v => v.id !== id));
  };

  React.useEffect(() => {
    return () => {
      // revoke on unmount
      value.forEach(v => URL.revokeObjectURL(v.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalCount = value.length + existingUrls.length;
  const canAddMore = totalCount < maxFiles;

  return (
    <div className={cn('space-y-3', className)}>
      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'group relative border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all',
            'hover:border-secondary hover:bg-mint/30',
            dragActive ? 'border-secondary bg-mint/40' : 'border-border/70 bg-muted/20',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <div className="flex flex-col items-center text-center gap-1">
            <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center text-mint-foreground">
              <Upload className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              Up to {maxFiles} images, {maxSizeMB}MB each
            </p>
          </div>
        </div>
      )}

      {(existingUrls.length > 0 || value.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {existingUrls.map((url) => (
            <div key={url} className="relative group rounded-lg overflow-hidden border border-border/60 aspect-square bg-muted">
              <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(url)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {value.map((p) => (
            <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border/60 aspect-square bg-muted">
              <img src={p.url} alt={p.file.name} loading="lazy" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <p className="text-[10px] text-white truncate">{p.file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/** Upload many files in parallel and return their public URLs. */
export async function uploadFilesParallel(
  files: PickedFile[],
  uploader: (file: File, idx: number) => Promise<string>,
): Promise<string[]> {
  if (files.length === 0) return [];
  return Promise.all(files.map((p, i) => uploader(p.file, i)));
}

// Re-export icon for callers that just want a placeholder
export const PlaceholderIcon = ImageIcon;
export const SpinnerIcon = Loader2;
