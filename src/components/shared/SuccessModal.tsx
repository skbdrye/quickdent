import { useEffect } from 'react';
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

export function SuccessModal({ open, title, description, onClose, autoDismissMs = 3000 }: SuccessModalProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, autoDismissMs);
    return () => clearTimeout(timer);
  }, [open, onClose, autoDismissMs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          'relative z-10 bg-card rounded-2xl border border-border shadow-2xl p-8 max-w-sm w-full text-center',
          'animate-in fade-in zoom-in-95 duration-300'
        )}
      >
        {/* Checkmark circle */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{description}</p>

        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    </div>
  );
}
