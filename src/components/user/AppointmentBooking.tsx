import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppointmentsStore, useAuthStore, useProfileStore, useClinicStore } from '@/lib/store';
import {
  notificationsAPI, scheduleOverridesAPI,
  SlotTakenError, BookingCooldownError, TooManyActiveBookingsError,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowRight, Calendar as CalendarIcon, CheckCircle2, CalendarPlus, Clock } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import type { DashboardPage, ScheduleOverride } from '@/lib/types';
import { SuccessModal } from '@/components/shared/SuccessModal';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { ServicePickerCard } from '@/components/shared/ServicePicker';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Step = 'service' | 'datetime' | 'confirm';

export function AppointmentBooking({ onNavigate }: { onNavigate?: (page: DashboardPage) => void }) {
  const { addAppointment } = useAppointmentsStore();
  const { user } = useAuthStore();
  const { profile, fetchProfile, fetchAssessment, isProfileComplete, isAssessmentSubmitted } = useProfileStore();
  const { schedule, fetchSchedule, services, fetchServices } = useClinicStore();
  const { toast } = useToast();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 24-hour cancel/reschedule policy: when the chosen slot starts inside the
  // next 24 hours we show a confirmation dialog so the patient knows they
  // won't be able to cancel or reschedule once they confirm.
  const [warnWithin24h, setWarnWithin24h] = useState(false);
  const isWithin24h = useMemo(() => {
    if (!selectedDate || !selectedTime) return false;
    const apt = new Date(`${selectedDate}T${selectedTime}`);
    return apt.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  }, [selectedDate, selectedTime]);
  const [successModal, setSuccessModal] = useState<{ open: boolean; date: string; time: string }>({ open: false, date: '', time: '' });
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchAssessment(user.id);
    }
    fetchSchedule();
    fetchServices();
    scheduleOverridesAPI.list().then(setOverrides).catch(() => {});
  }, [user?.id, fetchProfile, fetchAssessment, fetchSchedule, fetchServices]);

  const handleDate = useCallback((d: string | null) => {
    setSelectedDate(d);
    setSelectedTime(null);
  }, []);

  const handleService = useCallback((name: string) => {
    setSelectedService(name);
    // Reset date/time when service changes (in case the new service is unavailable on the picked day).
    setSelectedDate(null);
    setSelectedTime(null);
  }, []);

  const profileReady = isProfileComplete() && isAssessmentSubmitted();

  const activeService = useMemo(
    () => services.find(s => s.name === selectedService) || null,
    [services, selectedService],
  );

  const step: Step = !selectedService ? 'service' : (!selectedDate || !selectedTime) ? 'datetime' : 'confirm';

  /** Open the 24h confirm dialog if needed; otherwise book straight away. */
  const requestBook = () => {
    if (!selectedDate || !selectedTime || !selectedService || !user) {
      toast({ title: 'Incomplete', description: 'Please pick a service, date and time slot', variant: 'destructive' });
      return;
    }
    if (isWithin24h) {
      setWarnWithin24h(true);
      return;
    }
    void handleBook();
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !selectedService || !user) {
      toast({ title: 'Incomplete', description: 'Please pick a service, date and time slot', variant: 'destructive' });
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
        service: selectedService,
      });
      toast({ title: 'Booked!', description: 'Your appointment is pending admin approval.' });

      const patientName = profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user.username;
      await notificationsAPI.notifyAdmins(
        'New Appointment',
        `${patientName} booked an appointment for ${selectedService} on ${selectedDate} at ${formatTime(selectedTime)}.`,
        'new_booking',
        newApt?.id
      );
      const bookedDate = selectedDate;
      const bookedTime = selectedTime;
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setSuccessModal({ open: true, date: bookedDate, time: bookedTime });
    } catch (err) {
      if (err instanceof SlotTakenError) {
        toast({ title: 'Slot just taken', description: err.message, variant: 'destructive' });
        setSelectedTime(null);
      } else if (err instanceof BookingCooldownError) {
        toast({ title: 'Slow down a bit', description: err.message, variant: 'destructive' });
      } else if (err instanceof TooManyActiveBookingsError) {
        toast({ title: 'Too many active bookings', description: err.message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to book.', variant: 'destructive' });
      }
    }
    setIsSubmitting(false);
  };

  if (!profileReady) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-amber-200 dark:border-amber-800/60 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-amber-50 via-amber-50/50 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 px-6 py-7 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 ring-1 ring-amber-300/60 dark:ring-amber-800 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Just one more step</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Finish your profile so we can prepare for your visit safely.
            </p>
          </div>
          <div className="border-t border-border/40 p-5 space-y-2">
            <ProfileChecklistItem done={isProfileComplete()} label="Patient details" />
            <ProfileChecklistItem done={isAssessmentSubmitted()} label="Medical assessment" />
            {onNavigate && (
              <Button onClick={() => onNavigate('profile')} className="w-full mt-3 gap-1.5" size="lg">
                Complete my profile <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        icon={CalendarPlus}
        title="Book Appointment"
        description="Pick a service, then a date and time for your dental visit."
      />

      {/* Stepper */}
      <ol className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground overflow-x-auto pb-1">
        <StepBadge label="Service" active={step === 'service'} done={!!selectedService} />
        <ArrowRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
        <StepBadge label="Date & Time" active={step === 'datetime'} done={!!selectedDate && !!selectedTime} />
        <ArrowRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
        <StepBadge label="Confirm" active={step === 'confirm'} done={false} />
      </ol>

      {/* Service Picker */}
      <ServicePickerCard
        services={services}
        value={selectedService}
        onChange={handleService}
        loading={services.length === 0}
      />

      {/* Date & Time */}
      {selectedService && (
        <DateTimePicker
          weekly={schedule}
          overrides={overrides}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onDateChange={handleDate}
          onTimeChange={setSelectedTime}
          availableDays={activeService?.available_days}
          notOfferedLabel="N/A"
        />
      )}

      {/* Summary + book */}
      <div className="sticky bottom-2 z-10">
        <Card className="border-secondary/30 shadow-lg backdrop-blur bg-background/95 ring-1 ring-secondary/10">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-mint text-secondary shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0 text-sm">
              {selectedService ? (
                <p className="font-semibold text-foreground truncate">
                  {selectedService}
                  {selectedDate && selectedTime && (
                    <span className="text-muted-foreground font-normal"> &middot; {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(selectedTime)}</span>
                  )}
                </p>
              ) : (
                <p className="text-muted-foreground">Pick a service to begin</p>
              )}
            </div>
            <Button onClick={requestBook} size="lg" disabled={!selectedDate || !selectedTime || !selectedService || isSubmitting} className="shrink-0 gap-1.5">
              {isSubmitting ? 'Booking…' : <>Book Appointment <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <SuccessModal
        open={successModal.open}
        title="Appointment Booked!"
        description={`Your appointment on ${successModal.date ? new Date(successModal.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''} at ${formatTime(successModal.time)} is pending admin approval.`}
        onClose={() => {
          setSuccessModal({ open: false, date: '', time: '' });
          if (onNavigate) onNavigate('dashboard');
        }}
      />

      {/* 24-hour cancellation policy gate */}
      <AlertDialog open={warnWithin24h} onOpenChange={setWarnWithin24h}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 ring-1 ring-amber-200">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <AlertDialogTitle className="text-base">Less than 24 hours away</AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Your appointment on{' '}
              <span className="font-medium text-foreground">
                {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
                {selectedTime ? ` at ${formatTime(selectedTime)}` : ''}
              </span>{' '}
              starts within the next 24 hours. Once booked it{' '}
              <span className="font-semibold text-foreground">cannot be cancelled or rescheduled</span>.
              <br /><br />
              Do you wish to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Pick another time</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setWarnWithin24h(false); void handleBook(); }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Yes, book it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StepBadge({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 whitespace-nowrap shrink-0',
      done && 'bg-mint text-secondary ring-1 ring-secondary/20',
      active && !done && 'bg-secondary text-secondary-foreground shadow-sm scale-[1.02]',
      !active && !done && 'bg-muted/50 text-muted-foreground',
    )}>
      {done ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          active ? 'bg-secondary-foreground animate-pulse' : 'bg-muted-foreground/40',
        )} />
      )}
      {label}
    </span>
  );
}

function ProfileChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
      done
        ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20'
        : 'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20',
    )}>
      <span className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0',
        done ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white',
      )}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      </span>
      <span className={cn('text-sm font-medium', done ? 'text-foreground' : 'text-foreground')}>{label}</span>
      <span className={cn(
        'ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
        done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
      )}>{done ? 'Done' : 'Needed'}</span>
    </div>
  );
}
