import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Lock } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { getEffectiveDay, generateDaySlots, appointmentsAPI } from '@/lib/api';
import type { ClinicSchedule, ScheduleOverride } from '@/lib/types';

export interface DateTimePickerProps {
  weekly: ClinicSchedule | null;
  overrides: ScheduleOverride[];
  selectedDate: string | null;
  selectedTime: string | null;
  onDateChange: (date: string | null) => void;
  onTimeChange: (time: string | null) => void;
  /** Times reserved by the current user/group/etc — shown as "Held" instead of Booked. */
  takenByCurrent?: Set<string>;
  /** When true, hide the time-slot card (caller renders its own per-member). */
  hideTimeSlots?: boolean;
}

interface DayCellInfo {
  date: string;
  day: number;
  status: 'available' | 'closed' | 'fully_booked' | 'past';
  isToday: boolean;
  isSelected: boolean;
  totalSlots: number;
  bookedCount: number;
}

function formatSlotLabel(value: string) {
  const [h, m] = value.split(':').map(Number);
  const endMin = h * 60 + m + 30;
  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;
  const fmt = (hr: number, mn: number) => {
    const d = new Date();
    d.setHours(hr, mn);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  return `${fmt(h, m)} - ${fmt(endH, endM)}`;
}

export function DateTimePicker({
  weekly, overrides, selectedDate, selectedTime,
  onDateChange, onTimeChange, takenByCurrent, hideTimeSlots = false,
}: DateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    return selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
  });
  // booked counts cache: dateStr -> Set<string> of taken slot times
  const [bookedByDate, setBookedByDate] = React.useState<Record<string, Set<string>>>({});
  const [loadingDates, setLoadingDates] = React.useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  const calendarDays = React.useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  // Compute info for each visible date, and prefetch booked slot lists in batch
  const visibleDateInfos = React.useMemo<DayCellInfo[]>(() => {
    return calendarDays.filter((d): d is number => d !== null).map(day => {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const eff = getEffectiveDay(date, weekly, overrides);
      const isPast = date < todayStr;
      let status: DayCellInfo['status'];
      let totalSlots = 0;
      let bookedCount = 0;
      if (isPast) status = 'past';
      else if (!eff.day || !eff.day.is_open) status = 'closed';
      else {
        const slots = generateDaySlots(eff.day);
        totalSlots = slots.length;
        bookedCount = bookedByDate[date]?.size ?? 0;
        status = totalSlots > 0 && bookedCount >= totalSlots ? 'fully_booked' : 'available';
      }
      return {
        date, day,
        status,
        isToday: date === todayStr,
        isSelected: date === selectedDate,
        totalSlots,
        bookedCount,
      };
    });
  }, [calendarDays, year, month, weekly, overrides, todayStr, bookedByDate, selectedDate]);

  // Prefetch booked slots for all visible non-past, non-closed dates of this month
  const prefetchKey = React.useMemo(
    () => `${year}-${month}`,
    [year, month],
  );
  const prefetchedKeyRef = React.useRef<string>('');
  React.useEffect(() => {
    let cancelled = false;
    if (prefetchedKeyRef.current === prefetchKey) return;
    const candidates = visibleDateInfos
      .filter(d => d.status !== 'past' && d.status !== 'closed')
      .map(d => d.date);
    if (candidates.length === 0) return;
    setLoadingDates(true);
    (async () => {
      try {
        const map = await appointmentsAPI.fetchBookedSlotsBatch(candidates);
        if (cancelled) return;
        const next: Record<string, Set<string>> = {};
        for (const d of candidates) next[d] = new Set(map[d] || []);
        prefetchedKeyRef.current = prefetchKey;
        setBookedByDate(prev => ({ ...prev, ...next }));
      } finally {
        if (!cancelled) setLoadingDates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [prefetchKey, visibleDateInfos]);

  // Refresh booked slots for the selected date when it changes (faster cache invalidation)
  const refreshDate = React.useCallback(async (date: string) => {
    const list = await appointmentsAPI.fetchBookedSlots(date);
    setBookedByDate(prev => ({ ...prev, [date]: new Set(list) }));
  }, []);
  React.useEffect(() => {
    if (selectedDate) refreshDate(selectedDate);
  }, [selectedDate, refreshDate]);

  // Build the time slot list for the selected date
  const timeSlots = React.useMemo(() => {
    if (!selectedDate) return [] as { value: string; label: string; isBooked: boolean; isPast: boolean; isHeld: boolean }[];
    const eff = getEffectiveDay(selectedDate, weekly, overrides);
    if (!eff.day || !eff.day.is_open) return [];
    const slots = generateDaySlots(eff.day);
    const booked = bookedByDate[selectedDate] || new Set<string>();
    const now = new Date();
    return slots.map(value => {
      const [h, m] = value.split(':').map(Number);
      const isPast = selectedDate === todayStr && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));
      return {
        value,
        label: formatSlotLabel(value),
        isBooked: booked.has(value),
        isPast,
        isHeld: takenByCurrent?.has(value) || false,
      };
    });
  }, [selectedDate, weekly, overrides, bookedByDate, todayStr, takenByCurrent]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{monthLabel}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(year, month - 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(year, month + 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const info = visibleDateInfos.find(v => v.day === day)!;
              const closed = info.status === 'closed';
              const past = info.status === 'past';
              const fullyBooked = info.status === 'fully_booked';
              const disabled = past || closed;
              return (
                <button
                  key={info.date}
                  type="button"
                  disabled={disabled}
                  onClick={() => onDateChange(info.date)}
                  className={cn(
                    'relative rounded-lg p-2 pb-4 text-sm font-medium transition-colors flex flex-col items-center justify-start min-h-[3.25rem]',
                    disabled && 'cursor-not-allowed text-muted-foreground/30',
                    !disabled && !info.isSelected && !fullyBooked && 'hover:bg-mint text-foreground',
                    !disabled && !info.isSelected && fullyBooked && 'hover:bg-amber-500/10 text-foreground',
                    info.isSelected && 'bg-secondary text-secondary-foreground',
                    info.isToday && !info.isSelected && 'ring-1 ring-secondary',
                    fullyBooked && !info.isSelected && 'bg-amber-500/5',
                  )}
                >
                  <span>{day}</span>
                  {fullyBooked && (
                    <span className={cn(
                      'absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold leading-tight whitespace-nowrap uppercase tracking-tight',
                      info.isSelected ? 'text-secondary-foreground/90' : 'text-amber-700 dark:text-amber-400',
                    )}>Full</span>
                  )}
                  {closed && !past && (
                    <span className={cn(
                      'absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold leading-tight uppercase tracking-tight',
                      'text-muted-foreground/60',
                    )}>Closed</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend — only 3 indicators, placed BELOW the date grid */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span className="text-muted-foreground">Available</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> <span className="text-muted-foreground">Booked / Full</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" /> <span className="text-muted-foreground">Closed</span></span>
          </div>

          {selectedDate && (
            <p className="text-sm text-secondary mt-3 font-medium text-center">
              Selected: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {visibleDateInfos.find(v => v.date === selectedDate)?.status === 'fully_booked' && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">(Fully booked)</span>
              )}
            </p>
          )}
          {loadingDates && <p className="text-[10px] text-muted-foreground/60 text-center mt-1">Refreshing availability…</p>}
        </CardContent>
      </Card>

      {/* Time Slots */}
      {!hideTimeSlots && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" /> Time Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <SlotGrid
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onTimeChange={onTimeChange}
              timeSlots={timeSlots}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SlotGridProps {
  selectedDate: string | null;
  selectedTime: string | null;
  onTimeChange: (time: string | null) => void;
  timeSlots: { value: string; label: string; isBooked: boolean; isPast: boolean; isHeld: boolean }[];
}

export const SlotGrid = React.memo(function SlotGrid({ selectedDate, selectedTime, onTimeChange, timeSlots }: SlotGridProps) {
  if (!selectedDate) {
    return <p className="text-sm text-muted-foreground text-center py-6">Select a date first</p>;
  }
  if (timeSlots.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No slots available on this day</p>;
  }
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {timeSlots.map(slot => {
          const unavailable = slot.isBooked || slot.isPast;
          const isSelected = slot.value === selectedTime;
          return (
            <button
              key={slot.value}
              type="button"
              disabled={unavailable}
              aria-disabled={unavailable}
              onClick={() => onTimeChange(slot.value)}
              className={cn(
                'rounded-lg border p-2 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors',
                unavailable && 'cursor-not-allowed border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
                slot.isPast && 'opacity-40',
                !unavailable && !isSelected && 'border-border text-foreground hover:border-secondary/60 hover:bg-mint/40',
                isSelected && 'border-secondary bg-secondary text-secondary-foreground',
              )}
            >
              <span>{slot.label}</span>
              {slot.isBooked && (
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-tight font-semibold">
                  <Lock className="w-2.5 h-2.5" /> Booked
                </span>
              )}
              {slot.isPast && !slot.isBooked && (
                <span className="text-[10px] uppercase tracking-tight font-semibold opacity-60">Past</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span className="text-muted-foreground">Available</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> <span className="text-muted-foreground">Booked</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" /> <span className="text-muted-foreground">Closed</span></span>
      </div>
    </>
  );
});

// Re-export for convenience: a tiny inline slot grid usable per-member in GroupBooking
export interface InlineSlotGridProps {
  weekly: ClinicSchedule | null;
  overrides: ScheduleOverride[];
  date: string;
  selectedTime: string | null;
  takenByOthers: Set<string>;
  bookedSlots: Set<string>;
  onChange: (time: string) => void;
}

export const InlineSlotGrid = React.memo(function InlineSlotGrid({
  weekly, overrides, date, selectedTime, takenByOthers, bookedSlots, onChange,
}: InlineSlotGridProps) {
  const eff = React.useMemo(() => getEffectiveDay(date, weekly, overrides), [date, weekly, overrides]);
  const slots = React.useMemo<string[]>(
    () => (eff.day ? generateDaySlots(eff.day) : []),
    [eff.day],
  );
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
      {slots.map(value => {
        const [h, m] = value.split(':').map(Number);
        const isPastTime = date === today && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));
        const isBooked = bookedSlots.has(value);
        const isTaken = takenByOthers.has(value) && selectedTime !== value;
        const unavailable = isBooked || isTaken || isPastTime;
        const isSelected = value === selectedTime;
        return (
          <button
            key={value}
            type="button"
            disabled={unavailable}
            onClick={() => onChange(value)}
            className={cn(
              'rounded border p-1 flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors min-h-[2.25rem]',
              unavailable && !isPastTime && 'cursor-not-allowed border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
              isPastTime && 'cursor-not-allowed border-border/40 text-muted-foreground/40 opacity-50',
              !unavailable && !isSelected && 'border-border text-foreground hover:border-secondary/60 hover:bg-mint/40',
              isSelected && 'border-secondary bg-secondary text-secondary-foreground',
            )}
            title={isBooked ? 'Already booked' : isTaken ? 'Used by another member' : isPastTime ? 'Past time' : ''}
          >
            <span>{formatTime(value)}</span>
            {isBooked && <span className="text-[8px] uppercase tracking-tight flex items-center gap-0.5"><Lock className="w-2 h-2" /> Booked</span>}
          </button>
        );
      })}
    </div>
  );
});
