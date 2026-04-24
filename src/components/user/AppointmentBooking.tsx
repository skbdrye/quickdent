import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppointmentsStore, useAuthStore, useProfileStore, useClinicStore } from '@/lib/store';
import {
  notificationsAPI, scheduleOverridesAPI,
  SlotTakenError, BookingCooldownError, TooManyActiveBookingsError,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import type { DashboardPage, ScheduleOverride } from '@/lib/types';
import { SuccessModal } from '@/components/shared/SuccessModal';
import { DateTimePicker } from '@/components/shared/DateTimePicker';

export function AppointmentBooking({ onNavigate }: { onNavigate?: (page: DashboardPage) => void }) {
  const { addAppointment } = useAppointmentsStore();
  const { user } = useAuthStore();
  const { profile, fetchProfile, fetchAssessment, isProfileComplete, isAssessmentSubmitted } = useProfileStore();
  const { schedule, fetchSchedule } = useClinicStore();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<{ open: boolean; date: string; time: string }>({ open: false, date: '', time: '' });
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
      fetchAssessment(user.id);
    }
    fetchSchedule();
    scheduleOverridesAPI.list().then(setOverrides).catch(() => {});
  }, [user?.id, fetchProfile, fetchAssessment, fetchSchedule]);

  const handleDate = useCallback((d: string | null) => {
    setSelectedDate(d);
    setSelectedTime(null);
  }, []);

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

      const patientName = profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user.username;
      await notificationsAPI.notifyAdmins(
        'New Appointment',
        `${patientName} booked an appointment on ${selectedDate} at ${formatTime(selectedTime)}.`,
        'new_booking',
        newApt?.id
      );
      const bookedDate = selectedDate;
      const bookedTime = selectedTime;
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Book Appointment</h1>
        <p className="text-sm text-muted-foreground">Pick a date and time for your dental visit</p>
      </div>

      <DateTimePicker
        weekly={schedule}
        overrides={overrides}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onDateChange={handleDate}
        onTimeChange={setSelectedTime}
      />

      <Button onClick={handleBook} className="w-full" size="lg" disabled={!selectedDate || !selectedTime || isSubmitting}>
        {isSubmitting ? 'Booking...' : 'Book Appointment'}
      </Button>

      <SuccessModal
        open={successModal.open}
        title="Appointment Booked!"
        description={`Your appointment on ${successModal.date ? new Date(successModal.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''} at ${formatTime(successModal.time)} is pending admin approval.`}
        onClose={() => {
          setSuccessModal({ open: false, date: '', time: '' });
          if (onNavigate) onNavigate('dashboard');
        }}
      />
    </div>
  );
}
