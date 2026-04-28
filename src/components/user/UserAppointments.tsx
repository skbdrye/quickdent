import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, Clock, Users, RotateCcw, X, Search, Info, Stethoscope, CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, useAppointmentsStore } from '@/lib/store';
import { notificationsAPI, groupMembersAPI } from '@/lib/api';
import type { GroupMember } from '@/lib/types';
import { statusVariant } from '@/lib/types';
import { RescheduleDialog } from '@/components/shared/RescheduleDialog';
import { SuccessModal } from '@/components/shared/SuccessModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn, formatTime } from '@/lib/utils';

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
  // Per-appointment list of group members. The parent appointment row only
  // stores the booker's slot — every other member can have a different time
  // and they ALL need to be visible on the appointment card.
  const [memberMap, setMemberMap] = useState<Record<number, GroupMember[]>>({});

  useEffect(() => {
    if (user?.id) fetchUserAppointments(user.id);
  }, [user?.id, fetchUserAppointments]);

  // Hydrate `memberMap` whenever the user's appointments list refreshes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        const members = await groupMembersAPI.fetchByUser(user.id);
        if (cancelled) return;
        const map: Record<number, GroupMember[]> = {};
        for (const m of members) {
          const aId = (m as unknown as { appointment_id: number }).appointment_id;
          if (!aId) continue;
          (map[aId] ||= []).push(m);
        }
        setMemberMap(map);
      } catch (err) {
        console.warn('Failed to fetch group members:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, appointments]);

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
        if (!searchQuery) return matchesStatus;
        const q = searchQuery.toLowerCase();
        const service = ((a as unknown as { service?: string }).service || '').toLowerCase();
        const dateFormatted = new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
        const bookingType = a.is_group_booking ? 'companion group' : 'individual dental';
        const matchesSearch = service.includes(q) || dateFormatted.includes(q) || a.status.toLowerCase().includes(q) || bookingType.includes(q) || a.appointment_time.includes(q);
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

  // Counts for the quick-filter chip strip
  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = { all: appointments.length, Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0, 'No Show': 0 };
    for (const a of appointments) {
      if (a.status in acc) acc[a.status] += 1;
    }
    return acc;
  }, [appointments]);

  const canModify = (apt: typeof appointments[0]) => {
    if (apt.status !== 'Pending' && apt.status !== 'Confirmed') return false;
    const aptDate = new Date(apt.appointment_date + 'T' + apt.appointment_time);
    const now = new Date();
    const hoursUntil = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= 24;
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
          `${user?.username || 'A patient'} cancelled their appointment on ${apt.appointment_date} at ${formatTime(apt.appointment_time)}.\n\nReason: ${cancelReason.trim()}`,
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
        `${user?.username || 'A patient'} rescheduled their appointment to ${newDate} at ${formatTime(newTime)}.`,
        'reschedule',
        rescheduleId
      );
      setSuccessModal({
        open: true,
        title: 'Appointment Rescheduled',
        description: `Your appointment has been moved to ${new Date(newDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${formatTime(newTime)}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      throw err;
    }
  };

  const rescheduleApt = rescheduleId ? appointments.find(a => a.id === rescheduleId) : null;

  return (
    <div className="space-y-5 w-full max-w-5xl mx-auto">
      <PageHeader
        icon={CalendarCheck}
        title="My Appointments"
        description="View, reschedule, or cancel your appointments"
      />

      {/* Booking Rules Reminder */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-secondary/5 border border-secondary/20">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/15 text-secondary shrink-0">
          <Info className="w-4 h-4" />
        </span>
        <div className="text-xs text-foreground/80 space-y-0.5">
          <p>Cancellations & rescheduling must be at least <strong className="text-foreground">1 day (24 hours)</strong> before your appointment.</p>
          <p>Rescheduling is allowed <strong className="text-foreground">1 time only</strong> per appointment.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by service, date, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {([
            { v: 'all', label: 'All' },
            { v: 'Pending', label: 'Pending' },
            { v: 'Confirmed', label: 'Confirmed' },
            { v: 'Completed', label: 'Completed' },
            { v: 'Cancelled', label: 'Cancelled' },
            { v: 'No Show', label: 'No Show' },
          ]).map(opt => {
            const active = statusFilter === opt.v;
            const count = statusCounts[opt.v] ?? 0;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => setStatusFilter(opt.v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0',
                  active
                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {opt.label}
                <span className={cn(
                  'inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                  active ? 'bg-secondary-foreground/20 text-secondary-foreground' : 'bg-card text-muted-foreground',
                )}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments found"
          description={statusFilter !== 'all' ? 'Try changing the filter' : 'Book your first appointment to get started'}
          tone="muted"
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map(apt => (
            <Card
              key={apt.id}
              id={`apt-${apt.id}`}
              className={cn(
                'border-border/50 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-secondary/30',
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
                        {(() => {
                          // For group bookings list every distinct member time so
                          // the patient can see every slot they've booked.
                          if (apt.is_group_booking && memberMap[apt.id]?.length) {
                            const times = Array.from(new Set(memberMap[apt.id].map(m => m.appointment_time).filter(Boolean))).sort();
                            return (
                              <span className="flex items-center gap-1 flex-wrap">
                                <Clock className="w-3 h-3" />
                                {times.map((t, i) => (
                                  <span key={t} className="tabular-nums">
                                    {formatTime(t)}{i < times.length - 1 && <span className="text-muted-foreground/60">,</span>}
                                  </span>
                                ))}
                              </span>
                            );
                          }
                          return (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(apt.appointment_time)}
                            </span>
                          );
                        })()}
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
