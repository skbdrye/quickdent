import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuccessModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  autoDismissMs?: number;
}

export function SuccessModal({ open, title, description, onClose, autoDismissMs = 5000 }: SuccessModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const stableClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(stableClose, autoDismissMs);
    return () => clearTimeout(timer);
  }, [open, stableClose, autoDismissMs]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  // Render via portal to escape any Radix Dialog focus-trap / z-index stacking
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ pointerEvents: 'auto' }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={stableClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        className={cn(
          'relative bg-card rounded-2xl border border-border shadow-2xl p-8 max-w-sm w-full text-center',
          'animate-in fade-in zoom-in-95 duration-300'
        )}
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated checkmark */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>

        <Button
          onClick={stableClose}
          className="w-full"
          autoFocus
        >
          Done
        </Button>
      </div>
    </div>,
    document.body
  );
}
