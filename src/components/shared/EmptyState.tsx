import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Tone of the icon tile. */
  tone?: 'secondary' | 'muted' | 'info' | 'warning';
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** When provided, replaces the default action button. */
  children?: React.ReactNode;
  className?: string;
}

const TONE_STYLES: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  secondary: 'bg-mint text-secondary ring-secondary/15',
  muted: 'bg-muted/60 text-muted-foreground ring-border/40',
  info: 'bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-800/40',
  warning: 'bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800/40',
};

export const EmptyState = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'secondary',
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-border/50 border-dashed bg-card/60', className)}>
      <CardContent className="p-10 text-center">
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1',
            TONE_STYLES[tone],
          )}
        >
          <Icon className="w-7 h-7" />
        </div>
        <p className="font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>
        )}
        {(action || children) && (
          <div className="mt-5 flex items-center justify-center gap-2">
            {action && (
              <Button size="sm" className="gap-1.5" onClick={action.onClick}>
                {action.icon && <action.icon className="w-3.5 h-3.5" />}
                {action.label}
              </Button>
            )}
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
