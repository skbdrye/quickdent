import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useClinicStore } from '@/lib/store';
import { Stethoscope, Calendar as CalendarIcon, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

const DAY_SHORT: Record<string, string> = {
  sunday: 'Su', monday: 'Mo', tuesday: 'Tu', wednesday: 'We',
  thursday: 'Th', friday: 'Fr', saturday: 'Sa',
};
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function ServicesDisplay() {
  const { services, fetchServices } = useClinicStore();
  const [query, setQuery] = useState('');

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const todayKey = useMemo(() => DAY_KEYS[new Date().getDay()], []);

  const activeServices = useMemo(() => {
    return services
      .filter(s => s.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeServices;
    return activeServices.filter(s => s.name.toLowerCase().includes(q));
  }, [activeServices, query]);

  const availableToday = useMemo(() => {
    return activeServices.filter(s => {
      const days = s.available_days && s.available_days.length > 0 ? s.available_days : DAY_KEYS;
      return days.includes(todayKey);
    }).length;
  }, [activeServices, todayKey]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        icon={Stethoscope}
        title="Available Services"
        description="Browse the dental treatments offered at our clinic and the days they're available."
        actions={activeServices.length > 0 ? (
          <div className="hidden sm:flex items-center gap-1.5">
            <Badge variant="outline" className="text-[11px] tabular-nums">{activeServices.length} services</Badge>
            <Badge className="text-[11px] tabular-nums bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border-0">
              {availableToday} today
            </Badge>
          </div>
        ) : undefined}
      />

      {activeServices.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services..."
            className="pl-10 h-10"
          />
        </div>
      )}

      {activeServices.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No services available at the moment"
          description="Please check back later for our updated treatment list."
          tone="muted"
        />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No services match your search"
          description={`Try a different keyword. Showing ${activeServices.length} services in total.`}
          tone="muted"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredServices.map((service) => {
            const days = service.available_days && service.available_days.length > 0
              ? service.available_days
              : DAY_KEYS;
            const isToday = days.includes(todayKey);
            return (
              <Card key={service.id} className={cn(
                'border-border/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden',
                isToday ? 'hover:border-emerald-300/60' : 'hover:border-secondary/30',
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      'inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ring-1 transition-colors',
                      isToday ? 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800' : 'bg-mint text-secondary ring-secondary/15',
                    )}>
                      <Stethoscope className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground leading-tight">{service.name}</h3>
                        {isToday && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Today
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                        {DAY_KEYS.map(key => {
                          const enabled = days.includes(key);
                          const isCurrent = enabled && key === todayKey;
                          return (
                            <span
                              key={key}
                              className={cn(
                                'text-[10px] font-semibold tracking-tight w-6 h-6 inline-flex items-center justify-center rounded transition-colors',
                                isCurrent
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200 dark:ring-emerald-900'
                                  : enabled
                                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                                    : 'bg-muted/40 text-muted-foreground/50',
                              )}
                            >{DAY_SHORT[key]}</span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ServicesDisplay;
