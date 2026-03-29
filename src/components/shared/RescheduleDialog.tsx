import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppointmentsStore, useClinicStore } from '@/lib/store';
import type { ClinicScheduleDay } from '@/lib/types';

function generateTimeSlots(scheduleDay: ClinicScheduleDay | null) {
  const slots: { label: string; value: string; available: boolean }[] = [];
  if (!scheduleDay || !scheduleDay.is_open) return slots;
  const [openH, openM] = scheduleDay.open_time.split(':').map(Number);
  const [closeH, closeM] = scheduleDay.close_time.split(':').map(Number);
  const [bsH, bsM] = (scheduleDay.break_start || '12:00').split(':').map(Number);
  const [beH, beM] = (scheduleDay.break_end || '13:00').split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  const bsMin = bsH * 60 + bsM;
  const beMin = beH * 60 + beM;
  for (let t = openMin; t < closeMin; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const h24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const eT = t + 30;
    const eH = Math.floor(eT / 60);
    const eM = eT % 60;
    const fmt = (hr: number, mn: number) => { const d = new Date(); d.setHours(hr, mn); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
    slots.push({ label: `${fmt(h, m)} - ${fmt(eH, eM)}`, value: h24, available: !(t >= bsMin && t < beMin) });
  }
  return slots;
}

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: string;
  currentTime: string;
  onReschedule: (newDate: string, newTime: string) => Promise<void>;
}

export function RescheduleDialog({ open, onOpenChange, currentDate, currentTime, onReschedule }: RescheduleDialogProps) {
  const { schedule, fetchSchedule } = useClinicStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const loadBookedSlots = useCallback(async (date: string) => {
    const slots = await useAppointmentsStore.getState().fetchBookedSlots(date);
    setBookedSlots(new Set(slots));
  }, []);

  useEffect(() => { if (selectedDate) loadBookedSlots(selectedDate); }, [selectedDate, loadBookedSlots]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const getScheduleForDay = (dow: number): ClinicScheduleDay | null => schedule?.[String(dow)] || null;

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dow = new Date(selectedDate + 'T12:00:00').getDay();
    return generateTimeSlots(getScheduleForDay(dow));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, schedule]);

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;
    if (selectedDate === currentDate && selectedTime === currentTime) return;
    setIsSubmitting(true);
    try {
      await onReschedule(selectedDate, selectedTime);
      onOpenChange(false);
      setSelectedDate(null);
      setSelectedTime(null);
    } catch {
      // Error handled by parent
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
        </DialogHeader>

        {currentDate && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-3">
            Current: {new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {currentTime}
          </div>
        )}

        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(new Date(year, month - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(new Date(year, month + 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPast = dateStr < todayStr;
                const dow = new Date(year, month, day).getDay();
                const sDay = getScheduleForDay(dow);
                const isClosed = sDay ? !sDay.is_open : dow === 0;
                const isSelected = dateStr === selectedDate;
                const disabled = isPast || isClosed;
                return (
                  <button key={dateStr} disabled={disabled} onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}
                    className={cn(
                      'rounded-md p-1.5 text-xs font-medium transition-colors',
                      disabled && 'cursor-not-allowed text-muted-foreground/30',
                      !disabled && !isSelected && 'hover:bg-mint text-foreground',
                      isSelected && 'bg-secondary text-secondary-foreground',
                    )}>
                    {day}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedDate && (
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
              <Clock className="w-4 h-4" /> Select New Time
            </div>
            {timeSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No slots available</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {timeSlots.map(slot => {
                  const booked = bookedSlots.has(slot.value);
                  // Block past time slots if selected date is today
                  const isPastTime = selectedDate === todayStr && (() => {
                    const [h, m] = slot.value.split(':').map(Number);
                    const now = new Date();
                    return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
                  })();
                  const unavailable = !slot.available || booked || isPastTime;
                  const isSelected = slot.value === selectedTime;
                  return (
                    <button key={slot.value} disabled={unavailable} onClick={() => setSelectedTime(slot.value)}
                      className={cn(
                        'rounded-md border p-2 text-[10px] font-medium transition-colors',
                        unavailable && 'cursor-not-allowed border-border/50 text-muted-foreground/30 line-through',
                        !unavailable && !isSelected && 'border-border text-foreground hover:border-secondary/50',
                        isSelected && 'border-secondary bg-secondary text-secondary-foreground',
                      )}>
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Button onClick={handleReschedule} className="w-full" disabled={!selectedDate || !selectedTime || isSubmitting}>
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Rescheduling...</> : 'Confirm Reschedule'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
