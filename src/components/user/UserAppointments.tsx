import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, Clock, Users, RotateCcw, X, Search, Filter, Info, Stethoscope } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore, useAppointmentsStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { notificationsAPI } from '@/lib/api';
import { statusVariant } from '@/lib/types';
import { RescheduleDialog } from '@/components/shared/RescheduleDialog';
import { SuccessModal } from '@/components/shared/SuccessModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface UserAppointmentsProps {
  highlightAppointmentId?: number | null;
  highlightKey?: number;
}

export function UserAppointments({ highlightAppointmentId, highlightKey }: UserAppointmentsProps) {
  const { user } = useAuthStore();
  const { appointments, fetchUserAppointments, updateStatus, rescheduleAppointment } = useAppointmentsStore();
  const { toast } = useToast();
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });
  const [highlightingId, setHighlightingId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) fetchUserAppointments(user.id);
  }, [user?.id, fetchUserAppointments]);

  // Scroll to highlighted appointment with re-trigger support via highlightKey
  useEffect(() => {
    if (highlightAppointmentId) {
      setHighlightingId(highlightAppointmentId);
      setTimeout(() => {
        const el = document.getElementById(`apt-${highlightAppointmentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      const timer = setTimeout(() => {
        setHighlightingId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightAppointmentId, highlightKey]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(a => {
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        const matchesSearch = !searchQuery || a.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        // Sort by date descending, active statuses first
        const statusOrder: Record<string, number> = { 'Pending': 0, 'Confirmed': 1, 'Completed': 2, 'No Show': 3, 'Cancelled': 4 };
        const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return b.appointment_date.localeCompare(a.appointment_date);
      });
  }, [appointments, statusFilter, searchQuery]);

  const canModify = (apt: typeof appointments[0]) => {
    if (apt.status !== 'Pending' && apt.status !== 'Confirmed') return false;
    const aptDate = new Date(apt.appointment_date + 'T' + apt.appointment_time);
    const now = new Date();
    const hoursUntil = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= 1;
  };

  const canReschedule = (apt: typeof appointments[0]) => {
    return canModify(apt) && (apt.reschedule_count || 0) < 1;
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    if (!cancelReason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a reason for cancellation.', variant: 'destructive' });
      return;
    }
    try {
      await updateStatus(cancelId, 'Cancelled');
      const apt = appointments.find(a => a.id === cancelId);
      if (apt) {
        await notificationsAPI.notifyAdmins(
          'Appointment Cancelled',
          `${user?.username || 'A patient'} cancelled their appointment on ${apt.appointment_date} at ${apt.appointment_time}.\n\nReason: ${cancelReason.trim()}`,
          'cancellation',
          cancelId
        );
      }
      setSuccessModal({
        open: true,
        title: 'Appointment Cancelled',
        description: 'Your appointment has been cancelled successfully.',
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel appointment.', variant: 'destructive' });
    }
    setCancelId(null);
    setCancelReason('');
  };

  const handleReschedule = async (newDate: string, newTime: string) => {
    if (!rescheduleId) return;
    try {
      await rescheduleAppointment(rescheduleId, newDate, newTime, false);
      await notificationsAPI.notifyAdmins(
        'Appointment Rescheduled',
        `${user?.username || 'A patient'} rescheduled their appointment to ${newDate} at ${newTime}.`,
        'reschedule',
        rescheduleId
      );
      setSuccessModal({
        open: true,
        title: 'Appointment Rescheduled',
        description: `Your appointment has been moved to ${new Date(newDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${newTime}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      throw err;
    }
  };

  const rescheduleApt = rescheduleId ? appointments.find(a => a.id === rescheduleId) : null;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
        <p className="text-sm text-muted-foreground">View, reschedule, or cancel your appointments</p>
      </div>

      {/* Booking Rules Reminder */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/5 border border-secondary/20">
        <Info className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Cancellations & rescheduling must be at least <strong className="text-foreground">1 hour</strong> before your appointment.</p>
          <p>Rescheduling is allowed <strong className="text-foreground">1 time only</strong> per appointment.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search appointments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="No Show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-10 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-foreground">No appointments found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== 'all' ? 'Try changing the filter' : 'Book your first appointment to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map(apt => (
            <Card
              key={apt.id}
              id={`apt-${apt.id}`}
              className={cn(
                'border-border/50 overflow-hidden transition-all duration-500',
                highlightingId === apt.id && 'ring-2 ring-secondary ring-offset-2 shadow-md'
              )}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left - Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      {apt.is_group_booking ? <Users className="w-5 h-5 text-secondary" /> : <CalendarDays className="w-5 h-5 text-secondary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        {apt.is_group_booking ? 'Companion Booking' : 'Dental Appointment'}
                      </p>
                      {(apt.status === 'Confirmed' || apt.status === 'Completed') && (apt as unknown as { service?: string }).service && (
                        <p className="text-xs text-secondary font-medium flex items-center gap-1 mt-0.5">
                          <Stethoscope className="w-3 h-3" />
                          Service: {(apt as unknown as { service?: string }).service}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.appointment_time}
                        </span>
                      </div>
                      {apt.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Notes: {apt.notes}</p>
                      )}
                      {apt.reschedule_count && apt.reschedule_count > 0 && (
                        <p className="text-[11px] text-amber-600 mt-0.5">Rescheduled {apt.reschedule_count} time(s)</p>
                      )}
                    </div>
                  </div>

                  {/* Right - Status & Actions */}
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                    <div className="flex items-center gap-1.5">
                      {canReschedule(apt) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => setRescheduleId(apt.id)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reschedule
                        </Button>
                      )}
                      {canModify(apt) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          onClick={() => setCancelId(apt.id)}
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => { if (!open) { setCancelId(null); setCancelReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-sm font-medium">Reason for cancellation *</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this appointment..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCancelId(null); setCancelReason(''); }}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!cancelReason.trim()}
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RescheduleDialog
        open={!!rescheduleId}
        onOpenChange={(open) => !open && setRescheduleId(null)}
        currentDate={rescheduleApt?.appointment_date || ''}
        currentTime={rescheduleApt?.appointment_time || ''}
        onReschedule={handleReschedule}
      />

      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        description={successModal.description}
        onClose={() => setSuccessModal({ open: false, title: '', description: '' })}
      />
    </div>
  );
}
