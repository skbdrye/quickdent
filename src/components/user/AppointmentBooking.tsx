import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppointmentsStore, useAuthStore, useProfileStore, useClinicStore } from '@/lib/store';
import { notificationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClinicScheduleDay, DashboardPage } from '@/lib/types';
import { SuccessModal } from '@/components/shared/SuccessModal';

function generateTimeSlots(scheduleDay: ClinicScheduleDay | null) {
  const slots: { label: string; value: string; available: boolean }[] = [];
  if (!scheduleDay || !scheduleDay.is_open) return slots;

  const [openH, openM] = scheduleDay.open_time.split(':').map(Number);
  const [closeH, closeM] = scheduleDay.close_time.split(':').map(Number);
  const [breakStartH, breakStartM] = (scheduleDay.break_start || '12:00').split(':').map(Number);
  const [breakEndH, breakEndM] = (scheduleDay.break_end || '13:00').split(':').map(Number);

  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  const breakStartMin = breakStartH * 60 + breakStartM;
  const breakEndMin = breakEndH * 60 + breakEndM;

  for (let t = openMin; t < closeMin; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const h24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const endT = t + 30;
    const endH = Math.floor(endT / 60);
    const endM = endT % 60;

    const fmt = (hr: number, mn: number) => {
      const d = new Date();
      d.setHours(hr, mn);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const isDuringBreak = t >= breakStartMin && t < breakEndMin;

    slots.push({
      label: `${fmt(h, m)} - ${fmt(endH, endM)}`,
      value: h24,
      available: !isDuringBreak,
    });
  }
  return slots;
}

export function AppointmentBooking({ onNavigate }: { onNavigate?: (page: DashboardPage) => void }) {
  const { addAppointment } = useAppointmentsStore();
  const { user } = useAuthStore();
  const { profile, assessment, fetchProfile, fetchAssessment, isProfileComplete, isAssessmentSubmitted } = useProfileStore();
  const { schedule, fetchSchedule } = useClinicStore();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<{ open: boolean; date: string; time: string }>({ open: false, date: '', time: '' });

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchAssessment(user.id);
    }
    fetchSchedule();
  }, [user?.id, fetchProfile, fetchAssessment, fetchSchedule]);

  const loadBookedSlots = useCallback(async (date: string) => {
    const slots = await useAppointmentsStore.getState().fetchBookedSlots(date);
    setBookedSlots(new Set(slots));
  }, []);

  useEffect(() => {
    if (selectedDate) loadBookedSlots(selectedDate);
  }, [selectedDate, loadBookedSlots]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const getScheduleForDay = (dayOfWeek: number): ClinicScheduleDay | null => {
    if (!schedule) return null;
    return schedule[String(dayOfWeek)] || null;
  };

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeek = new Date(selectedDate + 'T12:00:00').getDay();
    return generateTimeSlots(getScheduleForDay(dayOfWeek));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, schedule]);

  const profileReady = isProfileComplete() && isAssessmentSubmitted();

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !user) {
      toast({ title: 'Incomplete', description: 'Please select both a date and time slot', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const newApt = await addAppointment({
        user_id: user.id,
        patient_name: profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user.username,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        duration_min: 30,
        notes: '',
        contact: profile?.phone || user.phone,
        status: 'Pending',
        is_group_booking: false,
      });
      toast({ title: 'Booked!', description: 'Your appointment is pending admin approval.' });

      // Notify admins
      const patientName = profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user.username;
      await notificationsAPI.notifyAdmins(
        'New Appointment',
        `${patientName} booked an appointment on ${selectedDate} at ${selectedTime}.`,
        'new_booking',
        newApt?.id
      );
      const bookedDate = selectedDate;
      const bookedTime = selectedTime;
      setSelectedDate(null);
      setSelectedTime(null);
      setSuccessModal({ open: true, date: bookedDate, time: bookedTime });
    } catch {
      toast({ title: 'Error', description: 'Failed to book.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  if (!profileReady) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-warning/30">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Complete Your Profile First</h2>
            <p className="text-muted-foreground text-sm mb-4">
              You need to fill out your patient details and medical history before booking an appointment.
            </p>
            <p className="text-xs text-muted-foreground">
              {!isProfileComplete() && 'Patient profile is incomplete. '}
              {!isAssessmentSubmitted() && 'Medical assessment not submitted.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Book Appointment</h1>
        <p className="text-sm text-muted-foreground">Pick a date and time for your dental visit</p>
      </div>

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
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast = dateStr < todayStr;
              const dayOfWeek = new Date(year, month, day).getDay();
              const scheduleDay = getScheduleForDay(dayOfWeek);
              const isClosed = scheduleDay ? !scheduleDay.is_open : dayOfWeek === 0;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const disabled = isPast || isClosed;

              return (
                <button key={dateStr} disabled={disabled} onClick={() => setSelectedDate(dateStr)} className={cn(
                  'rounded-lg p-2 text-sm font-medium transition-colors',
                  disabled && 'cursor-not-allowed text-muted-foreground/30',
                  !disabled && !isSelected && 'hover:bg-mint text-foreground',
                  isSelected && 'bg-secondary text-secondary-foreground',
                  isToday && !isSelected && 'ring-1 ring-secondary',
                )}>
                  {day}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> Closed</span>
          </div>
          {selectedDate && (
            <p className="text-sm text-secondary mt-2 font-medium">
              Selected: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" /> Time Slots</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground text-center py-6">Select a date first</p>
          ) : timeSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No slots available on this day</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
                  <button key={slot.value} disabled={unavailable} onClick={() => setSelectedTime(slot.value)} className={cn(
                    'rounded-lg border p-2.5 text-xs font-medium transition-colors',
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
        </CardContent>
      </Card>

      <Button onClick={handleBook} className="w-full" size="lg" disabled={!selectedDate || !selectedTime || isSubmitting}>
        {isSubmitting ? 'Booking...' : 'Book Appointment'}
      </Button>

      <SuccessModal
        open={successModal.open}
        title="Appointment Booked!"
        description={`Your appointment on ${successModal.date ? new Date(successModal.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''} at ${successModal.time} is pending admin approval.`}
        onClose={() => {
          setSuccessModal({ open: false, date: '', time: '' });
          if (onNavigate) onNavigate('dashboard');
        }}
      />
    </div>
  );
}
