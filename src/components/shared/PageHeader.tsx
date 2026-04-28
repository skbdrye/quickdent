import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  /** Lucide icon to render in the leading tile. */
  icon: LucideIcon;
  /** Page title (h1). */
  title: string;
  /** Subtitle / one-line description. */
  description?: string;
  /** Optional small chip/badge shown next to the title. */
  eyebrow?: React.ReactNode;
  /** Right-aligned slot for primary action(s). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Consistent, modern page header for every patient tab.
 * Uses the design-system mint gradient + a soft icon tile so every tab
 * feels like part of one product, not 10 different screens.
 */
export const PageHeader = React.memo(function PageHeader({
  icon: Icon,
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-card',
        'shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      {/* Decorative gradient wash — purely visual, behind content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mint/60 via-mint/15 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-secondary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -bottom-16 w-40 h-40 rounded-full bg-secondary/5 blur-3xl"
      />
      {/* Subtle bottom accent line for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-secondary/20 to-transparent"
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-4 min-w-0">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-card text-secondary shadow-sm ring-1 ring-secondary/15 shrink-0 transition-transform duration-300 hover:rotate-[-3deg] hover:scale-[1.03]">
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                {eyebrow}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
});

/**
 * Lightweight section heading inside a tab page (below PageHeader).
 */
export function SectionHeading({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-3 flex-wrap', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-mint text-secondary shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-tight truncate">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
