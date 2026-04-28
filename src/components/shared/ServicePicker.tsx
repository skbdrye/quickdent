import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClinicService } from '@/lib/types';

interface ServicePickerProps {
  services: ClinicService[];
  value: string | null;
  onChange: (serviceName: string) => void;
  loading?: boolean;
  /** Tighter card spacing for use inside a member card. */
  compact?: boolean;
}

const CONSULTATION_KEYWORD = 'consultation';

function isConsultation(name: string) {
  return name.toLowerCase().includes(CONSULTATION_KEYWORD);
}

export const ServicePicker = React.memo(function ServicePicker({
  services, value, onChange, loading, compact,
}: ServicePickerProps) {
  const active = React.useMemo(
    () => services.filter(s => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [services],
  );

  const consultationName = React.useMemo(
    () => active.find(s => isConsultation(s.name))?.name || null,
    [active],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/40" />
        ))}
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No services are currently offered. Please check back later.
      </p>
    );
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {/* Consultation tip */}
      {consultationName && (
        <div className={cn(
          'flex items-start gap-2.5 rounded-lg border border-secondary/25 bg-mint/60 text-secondary px-3 py-2.5',
          compact ? 'text-[11px]' : 'text-xs sm:text-sm',
        )}>
          <Info className={cn('shrink-0 mt-0.5', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <p className="leading-snug text-foreground/90">
            Not sure which service you need? Choose <span className="font-semibold text-secondary">{consultationName}</span> &mdash; our dentist will assess you and recommend the right treatment.
          </p>
        </div>
      )}

      <div className={cn('grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3')}>
        {active.map(service => {
          const selected = value === service.name;
          const isCons = isConsultation(service.name);
          const recommended = !value && isCons;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onChange(service.name)}
              className={cn(
                'group relative rounded-lg border bg-card text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-secondary/40',
                compact ? 'p-2.5' : 'p-3',
                selected
                  ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
                  : 'border-border hover:border-secondary/60 hover:bg-mint/40 hover:-translate-y-0.5',
              )}
            >
              <div className="flex items-start gap-2">
                <span className={cn(
                  'shrink-0 inline-flex items-center justify-center rounded-md',
                  compact ? 'w-7 h-7' : 'w-8 h-8',
                  selected ? 'bg-secondary-foreground/15 text-secondary-foreground' : 'bg-mint text-secondary',
                )}>
                  <Stethoscope className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-semibold leading-tight', compact ? 'text-xs' : 'text-sm')}>{service.name}</p>
                  {recommended && (
                    <Badge variant="outline" className={cn('mt-1 border-secondary/40 text-secondary bg-mint/60', compact ? 'text-[9px] py-0 px-1.5' : 'text-[10px]')}>
                      Recommended
                    </Badge>
                  )}
                </div>
                {selected && (
                  <CheckCircle2 className={cn('shrink-0 text-secondary-foreground', compact ? 'w-4 h-4' : 'w-4 h-4')} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Wraps the ServicePicker in a styled card with a header. Used by the booking
 * pages to keep visual hierarchy consistent.
 */
export function ServicePickerCard(props: ServicePickerProps & { title?: string; description?: string }) {
  const { title = 'Choose a service', description = 'Pick what you need today. You can change it later before confirming.', ...rest } = props;
  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-mint/70 via-mint/30 to-transparent px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-card text-secondary shadow-sm ring-1 ring-secondary/15">
            <Stethoscope className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <CardContent className="pt-4 pb-5 space-y-3">
        <ServicePicker {...rest} />
      </CardContent>
    </Card>
  );
}
