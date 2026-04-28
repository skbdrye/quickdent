import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEffectiveDay, generateDaySlots, getDayCapacity, appointmentsAPI } from '@/lib/api';
import type { ClinicSchedule, ScheduleOverride } from '@/lib/types';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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
  /**
   * Optional list of weekday names (lowercase: 'monday', etc) on which the
   * picker should treat dates as available. Used when a service is only
   * offered on certain days. When omitted, all weekdays are allowed.
   */
  availableDays?: string[];
  /** Optional label shown when a date is filtered out by availableDays. */
  notOfferedLabel?: string;
}

interface DayCellInfo {
  date: string;
  day: number;
  status: 'available' | 'closed' | 'fully_booked' | 'past' | 'not_offered';
  isToday: boolean;
  isSelected: boolean;
  totalSlots: number;
  bookedCount: number;
  totalCapacity: number;
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

interface DateCounts { byTime: Record<string, number>; total: number }

export function DateTimePicker({
  weekly, overrides, selectedDate, selectedTime,
  onDateChange, onTimeChange, takenByCurrent, hideTimeSlots = false,
  availableDays, notOfferedLabel = 'N/A',
}: DateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    return selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
  });
  // Per-date counts cache: dateStr -> { byTime: { time: count }, total }
  const [countsByDate, setCountsByDate] = React.useState<Record<string, DateCounts>>({});
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

  const availableDaysSet = React.useMemo(
    () => (availableDays && availableDays.length > 0 ? new Set(availableDays.map(d => d.toLowerCase())) : null),
    [availableDays],
  );

  // Compute info for each visible date
  const visibleDateInfos = React.useMemo<DayCellInfo[]>(() => {
    return calendarDays.filter((d): d is number => d !== null).map(day => {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const eff = getEffectiveDay(date, weekly, overrides);
      const isPast = date < todayStr;
      const dow = new Date(date + 'T12:00:00').getDay();
      const dayKey = DAY_KEYS[dow];
      let status: DayCellInfo['status'];
      let totalSlots = 0;
      let bookedCount = 0;
      let totalCapacity = 0;
      if (isPast) status = 'past';
      else if (!eff.day || !eff.day.is_open) status = 'closed';
      else if (availableDaysSet && !availableDaysSet.has(dayKey)) status = 'not_offered';
      else {
        const slots = generateDaySlots(eff.day);
        const cap = getDayCapacity(eff.day, eff.override);
        totalSlots = slots.length;
        totalCapacity = totalSlots * cap.perSlot;
        const counts = countsByDate[date];
        if (counts) {
          bookedCount = counts.total;
        }
        // A date is "fully booked" only when EVERY slot is at capacity
        // OR when the per-day cap is reached.
        const allSlotsFull = totalSlots > 0 && counts && slots.every(t => (counts.byTime[t] || 0) >= cap.perSlot);
        const dailyHit = cap.daily !== null && counts && counts.total >= cap.daily;
        status = (allSlotsFull || dailyHit) ? 'fully_booked' : 'available';
      }
      return {
        date, day,
        status,
        isToday: date === todayStr,
        isSelected: date === selectedDate,
        totalSlots,
        bookedCount,
        totalCapacity,
      };
    });
  }, [calendarDays, year, month, weekly, overrides, todayStr, countsByDate, selectedDate, availableDaysSet]);

  // Prefetch booked slot counts for all visible non-past, non-closed dates of this month
  const prefetchKey = React.useMemo(
    () => `${year}-${month}`,
    [year, month],
  );
  const prefetchedKeyRef = React.useRef<string>('');
  React.useEffect(() => {
    let cancelled = false;
    if (prefetchedKeyRef.current === prefetchKey) return;
    const candidates = visibleDateInfos
      .filter(d => d.status !== 'past' && d.status !== 'closed' && d.status !== 'not_offered')
      .map(d => d.date);
    if (candidates.length === 0) return;
    setLoadingDates(true);
    (async () => {
      try {
        const map = await appointmentsAPI.fetchSlotCountsBatch(candidates);
        if (cancelled) return;
        prefetchedKeyRef.current = prefetchKey;
        setCountsByDate(prev => ({ ...prev, ...map }));
      } finally {
        if (!cancelled) setLoadingDates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [prefetchKey, visibleDateInfos]);

  // Refresh counts for the selected date when it changes
  const refreshDate = React.useCallback(async (date: string) => {
    const counts = await appointmentsAPI.fetchSlotCounts(date);
    setCountsByDate(prev => ({ ...prev, [date]: counts }));
  }, []);
  React.useEffect(() => {
    if (selectedDate) refreshDate(selectedDate);
  }, [selectedDate, refreshDate]);

  // Build the time-slot list for the selected date with capacity-aware status
  const timeSlots = React.useMemo(() => {
    if (!selectedDate) return [] as { value: string; label: string; isBooked: boolean; isPast: boolean; isHeld: boolean; usedCount: number; perSlot: number }[];
    const eff = getEffectiveDay(selectedDate, weekly, overrides);
    if (!eff.day || !eff.day.is_open) return [];
    const slots = generateDaySlots(eff.day);
    const counts = countsByDate[selectedDate]?.byTime || {};
    const cap = getDayCapacity(eff.day, eff.override);
    const total = countsByDate[selectedDate]?.total || 0;
    const dayFull = cap.daily !== null && total >= cap.daily;
    const now = new Date();
    return slots.map(value => {
      const [h, m] = value.split(':').map(Number);
      const isPast = selectedDate === todayStr && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));
      const used = counts[value] || 0;
      const isHeld = takenByCurrent?.has(value) || false;
      // Treat as "held" only if it's actually counted toward capacity (current user)
      const isBooked = used >= cap.perSlot || dayFull;
      return {
        value,
        label: formatSlotLabel(value),
        isBooked,
        isPast,
        isHeld,
        usedCount: used,
        perSlot: cap.perSlot,
      };
    });
  }, [selectedDate, weekly, overrides, countsByDate, todayStr, takenByCurrent]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{monthLabel}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(new Date(year, month - 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(new Date(year, month + 1))}><ChevronRight className="w-4 h-4" /></Button>
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
              const notOffered = info.status === 'not_offered';
              const disabled = past || closed || notOffered;
              return (
                <button
                  key={info.date}
                  type="button"
                  disabled={disabled}
                  onClick={() => onDateChange(info.date)}
                  className={cn(
                    'relative rounded-lg p-2 pb-4 text-sm font-medium transition-all duration-150 flex flex-col items-center justify-start min-h-[3.25rem]',
                    disabled && 'cursor-not-allowed text-muted-foreground/30',
                    !disabled && !info.isSelected && !fullyBooked && 'hover:bg-mint hover:scale-[1.04] text-foreground',
                    !disabled && !info.isSelected && fullyBooked && 'hover:bg-amber-500/10 text-foreground',
                    info.isSelected && 'bg-secondary text-secondary-foreground shadow-sm scale-[1.04]',
                    info.isToday && !info.isSelected && 'ring-1 ring-secondary',
                    fullyBooked && !info.isSelected && 'bg-amber-500/5',
                    notOffered && !past && 'bg-muted/40',
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
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold leading-tight uppercase tracking-tight text-muted-foreground/60">Closed</span>
                  )}
                  {notOffered && !past && !closed && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold leading-tight uppercase tracking-tight text-muted-foreground/60">{notOfferedLabel}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span className="text-muted-foreground">Available</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> <span className="text-muted-foreground">Full</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" /> <span className="text-muted-foreground">Closed / N/A</span></span>
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
        <Card className="border-border/50 shadow-sm">
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
  timeSlots: { value: string; label: string; isBooked: boolean; isPast: boolean; isHeld: boolean; usedCount: number; perSlot: number }[];
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
          const showCapacity = slot.perSlot > 1 && !slot.isPast;
          return (
            <button
              key={slot.value}
              type="button"
              disabled={unavailable}
              aria-disabled={unavailable}
              onClick={() => onTimeChange(slot.value)}
              className={cn(
                'rounded-lg border p-2 flex flex-col items-center gap-0.5 text-xs font-medium transition-all duration-150',
                unavailable && 'cursor-not-allowed border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
                slot.isPast && 'opacity-40',
                !unavailable && !isSelected && 'border-border text-foreground hover:border-secondary/60 hover:bg-mint/40 hover:-translate-y-0.5',
                isSelected && 'border-secondary bg-secondary text-secondary-foreground shadow-sm',
              )}
            >
              <span>{slot.label}</span>
              {slot.isBooked && (
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-tight font-semibold">
                  <Lock className="w-2.5 h-2.5" /> Full
                </span>
              )}
              {!slot.isBooked && showCapacity && (
                <span className="text-[10px] tracking-tight font-medium opacity-70">{slot.usedCount}/{slot.perSlot} booked</span>
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
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> <span className="text-muted-foreground">Full</span></span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" /> <span className="text-muted-foreground">Past</span></span>
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
  /** Map of time → number of confirmed bookings already placed at that slot. */
  bookedCounts: Record<string, number>;
  onChange: (time: string) => void;
}

export const InlineSlotGrid = React.memo(function InlineSlotGrid({
  weekly, overrides, date, selectedTime, takenByOthers, bookedCounts, onChange,
}: InlineSlotGridProps) {
  const eff = React.useMemo(() => getEffectiveDay(date, weekly, overrides), [date, weekly, overrides]);
  const slots = React.useMemo<string[]>(
    () => (eff.day ? generateDaySlots(eff.day) : []),
    [eff.day],
  );
  const cap = React.useMemo(() => getDayCapacity(eff.day, eff.override), [eff.day, eff.override]);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  return (
    // Same look as the main SlotGrid (range labels, "X/Y booked" text, full
    // and past badges) so individual booking and book-for-others share one
    // visual language across the app.
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {slots.map(value => {
        const [h, m] = value.split(':').map(Number);
        const isPastTime = date === today && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));
        const used = bookedCounts[value] || 0;
        const isFull = used >= cap.perSlot;
        const isTaken = takenByOthers.has(value) && selectedTime !== value;
        const unavailable = isFull || isTaken || isPastTime;
        const isSelected = value === selectedTime;
        const showCapacity = cap.perSlot > 1 && !isPastTime;
        return (
          <button
            key={value}
            type="button"
            disabled={unavailable}
            aria-disabled={unavailable}
            onClick={() => onChange(value)}
            className={cn(
              'rounded-lg border p-2 flex flex-col items-center gap-0.5 text-xs font-medium transition-all duration-150',
              unavailable && !isPastTime && 'cursor-not-allowed border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
              isPastTime && 'cursor-not-allowed border-border/40 text-muted-foreground/40 opacity-50',
              !unavailable && !isSelected && 'border-border text-foreground hover:border-secondary/60 hover:bg-mint/40 hover:-translate-y-0.5',
              isSelected && 'border-secondary bg-secondary text-secondary-foreground shadow-sm',
            )}
            title={isFull ? 'Slot full' : isTaken ? 'Used by another member' : isPastTime ? 'Past time' : ''}
          >
            <span className="tabular-nums">{formatSlotLabel(value)}</span>
            {isFull && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-tight font-semibold">
                <Lock className="w-2.5 h-2.5" /> Full
              </span>
            )}
            {!isFull && isTaken && (
              <span className="text-[10px] uppercase tracking-tight font-semibold opacity-70">Used</span>
            )}
            {!isFull && !isTaken && showCapacity && (
              <span className="text-[10px] tracking-tight font-medium opacity-70">{used}/{cap.perSlot} booked</span>
            )}
            {isPastTime && !isFull && (
              <span className="text-[10px] uppercase tracking-tight font-semibold opacity-60">Past</span>
            )}
          </button>
        );
      })}
    </div>
  );
});
