import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore, useStandbyStore, useProfileStore, useAppointmentsStore, useClinicStore } from '@/lib/store';
import { notificationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { SuccessModal } from '@/components/shared/SuccessModal';
import {
  Clock, CalendarDays, AlertTriangle, Loader2, X, CheckCircle2, Timer, Ban,
  ChevronLeft, ChevronRight, Info, User as UserIcon, Users,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ClinicScheduleDay } from '@/lib/types';

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];
const CURRENT_YEAR = new Date().getFullYear();
// Allow selecting up to 12 months out for standby
const STANDBY_YEARS = [String(CURRENT_YEAR), String(CURRENT_YEAR + 1)];

function daysInMonth(year: string, month: string) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

function totalSlotsForSchedule(scheduleDay: ClinicScheduleDay | null): number {
  if (!scheduleDay || !scheduleDay.is_open) return 0;
  const [openH, openM] = scheduleDay.open_time.split(':').map(Number);
  const [closeH, closeM] = scheduleDay.close_time.split(':').map(Number);
  const [bsH, bsM] = (scheduleDay.break_start || '12:00').split(':').map(Number);
  const [beH, beM] = (scheduleDay.break_end || '13:00').split(':').map(Number);
  const open = openH * 60 + openM;
  const close = closeH * 60 + closeM;
  const bs = bsH * 60 + bsM;
  const be = beH * 60 + beM;
  let count = 0;
  for (let t = open; t < close; t += 30) {
    if (t < bs || t >= be) count++;
  }
  return count;
}

type Mode = 'self' | 'other';

export default function StandbyBooking() {
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useProfileStore();
  const { requests, fetchByUser, addRequest, cancelRequest, isLoading } = useStandbyStore();
  const { fetchBookedSlots } = useAppointmentsStore();
  const { schedule, fetchSchedule } = useClinicStore();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('self');

  // Birthday-style date picker (Year / Month / Day)
  const [dateParts, setDateParts] = useState<{ year: string; month: string; day: string }>({ year: '', month: '', day: '' });

  // For others
  const [otherName, setOtherName] = useState('');
  const [otherPhone, setOtherPhone] = useState('');
  const [otherRelationship, setOtherRelationship] = useState('');

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });

  // Slot availability map for the chosen date
  const [slotInfo, setSlotInfo] = useState<{ total: number; booked: number; loading: boolean } | null>(null);

  useEffect(() => {
    if (user?.id) { fetchByUser(user.id); fetchProfile(user.id); }
    fetchSchedule();
  }, [user?.id, fetchByUser, fetchProfile, fetchSchedule]);

  const todayStr = new Date().toISOString().split('T')[0];

  const selectedDate = useMemo(() => {
    if (dateParts.year && dateParts.month && dateParts.day) {
      return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    }
    return '';
  }, [dateParts]);

  // Fetch slot info whenever date changes
  useEffect(() => {
    if (!selectedDate || !schedule) { setSlotInfo(null); return; }
    let cancelled = false;
    setSlotInfo({ total: 0, booked: 0, loading: true });
    (async () => {
      const dow = new Date(selectedDate + 'T12:00:00').getDay();
      const scheduleDay = schedule[String(dow)] || null;
      const total = totalSlotsForSchedule(scheduleDay);
      try {
        const booked = await fetchBookedSlots(selectedDate);
        if (!cancelled) setSlotInfo({ total, booked: booked.length, loading: false });
      } catch {
        if (!cancelled) setSlotInfo({ total, booked: 0, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate, schedule, fetchBookedSlots]);

  const isPastDate = !!selectedDate && selectedDate < todayStr;
  const dayOfWeek = selectedDate ? new Date(selectedDate + 'T12:00:00').getDay() : null;
  const scheduleForDay = dayOfWeek !== null && schedule ? schedule[String(dayOfWeek)] : null;
  const isClosed = !!selectedDate && (!scheduleForDay || !scheduleForDay.is_open);
  const isFullyBooked = !!slotInfo && !slotInfo.loading && slotInfo.total > 0 && slotInfo.booked >= slotInfo.total;
  const dateUsable = !!selectedDate && !isPastDate && !isClosed && isFullyBooked;

  const handleDatePart = useCallback((part: 'year' | 'month' | 'day', value: string) => {
    setDateParts(prev => {
      const next = { ...prev, [part]: value };
      if (next.year && next.month) {
        const max = daysInMonth(next.year, next.month);
        if (Number(next.day) > max) next.day = String(max).padStart(2, '0');
      }
      return next;
    });
  }, []);

  const dayOptions = useMemo(() => {
    const max = daysInMonth(dateParts.year, dateParts.month);
    return Array.from({ length: max }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [dateParts.year, dateParts.month]);

  const ownerPatientName = useMemo(() => {
    if (!profile) return user?.username || '';
    const full = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    return full || user?.username || '';
  }, [profile, user?.username]);

  const resetForm = useCallback(() => {
    setDateParts({ year: '', month: '', day: '' });
    setReason('');
    setOtherName('');
    setOtherPhone('');
    setOtherRelationship('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedDate) {
      toast({ title: 'Pick a date', description: 'Please select your preferred date first.', variant: 'destructive' });
      return;
    }
    if (isPastDate) {
      toast({ title: 'Invalid date', description: 'Please pick today or a future date.', variant: 'destructive' });
      return;
    }
    if (isClosed) {
      toast({ title: 'Clinic closed', description: 'The clinic is closed on this date.', variant: 'destructive' });
      return;
    }
    if (!isFullyBooked) {
      toast({
        title: 'This day is not fully booked yet',
        description: 'Standby is only available when no slots remain. Please book using the Book Appointment tab.',
        variant: 'destructive',
      });
      return;
    }
    if (mode === 'other') {
      if (!otherName.trim()) {
        toast({ title: 'Name required', description: 'Please enter the patient name.', variant: 'destructive' });
        return;
      }
      if (!otherPhone.trim()) {
        toast({ title: 'Phone required', description: 'Phone number is required when booking for someone else.', variant: 'destructive' });
        return;
      }
    }
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Tell the clinic why this visit is needed.', variant: 'destructive' });
      return;
    }

    const patientName = mode === 'other' ? otherName.trim() : ownerPatientName;
    const contact = mode === 'other' ? otherPhone.trim() : (profile?.phone || user.phone);
    const reasonFinal = mode === 'other'
      ? `[For ${otherRelationship || 'unregistered patient'}] ${reason.trim()}`
      : reason.trim();

    setSubmitting(true);
    try {
      await addRequest({
        user_id: user.id,
        patient_name: patientName,
        contact,
        preferred_date: selectedDate,
        reason: reasonFinal,
        status: 'Waiting',
      });

      await notificationsAPI.notifyAdmins(
        'New Standby Request',
        `${patientName} requested a standby slot for ${selectedDate}.\n\nReason: ${reasonFinal}`,
        'standby',
      );

      setSuccessModal({
        open: true,
        title: 'Standby request submitted',
        description: 'You will be notified if a slot becomes available.',
      });
      resetForm();
    } catch (err) {
      console.error('[Standby] insert failed:', err);
      toast({
        title: 'Could not submit request',
        description: 'Please try again. If this keeps happening, the clinic team has been notified.',
        variant: 'destructive',
      });
    }
    setSubmitting(false);
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await cancelRequest(cancelId);
      toast({ title: 'Cancelled', description: 'Your standby request has been cancelled.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel request.', variant: 'destructive' });
    }
    setCancelId(null);
  };

  const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
    Waiting: { icon: Timer, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    Confirmed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    Expired: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/30' },
    Cancelled: { icon: Ban, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Waiting': return 'pending' as const;
      case 'Confirmed': return 'confirmed' as const;
      case 'Cancelled': return 'cancelled' as const;
      default: return 'default' as const;
    }
  };

  // Banner that explains the current date selection state
  const dateBanner = (() => {
    if (!selectedDate) return null;
    if (isPastDate) {
      return { tone: 'destructive', icon: AlertTriangle, title: 'Past date', body: 'Pick today or a future date.' };
    }
    if (isClosed) {
      return { tone: 'destructive', icon: AlertTriangle, title: 'Clinic closed', body: 'No appointments are scheduled for this day.' };
    }
    if (slotInfo?.loading) {
      return { tone: 'muted', icon: Loader2, title: 'Checking availability...', body: '' };
    }
    if (!isFullyBooked) {
      return {
        tone: 'warning',
        icon: Info,
        title: 'This day is not fully booked yet',
        body: `${slotInfo ? slotInfo.total - slotInfo.booked : '?'} slot(s) still open. Standby is only for fully booked days — please book using the "Book Appointment" tab instead.`,
      };
    }
    return {
      tone: 'success',
      icon: CheckCircle2,
      title: 'This day is fully booked',
      body: 'You can join the standby queue. Staff will assign a slot if one opens up.',
    };
  })();

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Standby / Walk-in Queue</h1>
        <p className="text-muted-foreground">Request a slot when the schedule is fully booked</p>
      </div>

      {/* How it works */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/80 space-y-1">
              <p className="font-semibold text-foreground">How it works</p>
              <ul className="space-y-0.5 text-xs">
                <li>Standby is only available when your preferred date is fully booked.</li>
                <li>If a slot opens (e.g., due to a cancellation), staff will assign you a time and notify you.</li>
                <li><strong className="text-foreground">There is no guarantee</strong> that a slot will open up.</li>
                <li>You cannot pick a specific time — staff will assign one if available.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Form */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">New Standby Request</CardTitle>
        </CardHeader>
        <CardContent>
          {/* For-self / For-others toggle */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-5">
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger value="self" className="gap-1.5"><UserIcon className="w-4 h-4" /> For myself</TabsTrigger>
              <TabsTrigger value="other" className="gap-1.5"><Users className="w-4 h-4" /> For someone else</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'self' ? (
              <div>
                <Label>Patient name</Label>
                <Input value={ownerPatientName} disabled className="mt-1.5 bg-muted" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="other-name">Patient name *</Label>
                  <Input id="other-name" value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="Full name" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="other-phone">Phone number *</Label>
                  <Input id="other-phone" value={otherPhone} onChange={(e) => setOtherPhone(e.target.value)} placeholder="e.g. 09171234567" className="mt-1.5" inputMode="tel" />
                </div>
                <div>
                  <Label htmlFor="other-rel">Relationship</Label>
                  <Select value={otherRelationship} onValueChange={setOtherRelationship}>
                    <SelectTrigger id="other-rel" className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Friend', 'Other'].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Birthday-style date picker */}
            <div>
              <Label>Preferred date *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <Select value={dateParts.month} onValueChange={(v) => handleDatePart('month', v)}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={dateParts.day} onValueChange={(v) => handleDatePart('day', v)}>
                  <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent>{dayOptions.map(d => <SelectItem key={d} value={d}>{Number(d)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={dateParts.year} onValueChange={(v) => handleDatePart('year', v)}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{STANDBY_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {dateBanner && (
                <div className={cn(
                  'mt-3 rounded-lg border p-3 flex items-start gap-2 text-sm',
                  dateBanner.tone === 'success' && 'border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300',
                  dateBanner.tone === 'warning' && 'border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300',
                  dateBanner.tone === 'destructive' && 'border-red-200 bg-red-50/50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300',
                  dateBanner.tone === 'muted' && 'border-border bg-muted/40 text-muted-foreground',
                )}>
                  <dateBanner.icon className={cn('w-4 h-4 shrink-0 mt-0.5', dateBanner.tone === 'muted' && 'animate-spin')} />
                  <div className="space-y-0.5">
                    <p className="font-semibold leading-tight">{dateBanner.title}</p>
                    {dateBanner.body && <p className="text-xs leading-snug">{dateBanner.body}</p>}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> You cannot choose a time — staff will assign one if a slot opens.
              </p>
            </div>

            <div>
              <Label htmlFor="standby-reason">Reason / notes *</Label>
              <Textarea
                id="standby-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the dental concern or reason for the visit..."
                className="mt-1.5 min-h-[90px]"
              />
            </div>

            <Button type="submit" disabled={submitting || !dateUsable || !reason.trim()} className="gap-1.5">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Clock className="w-4 h-4" /> Submit standby request</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Requests */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">My standby requests</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-10 text-center">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium text-foreground">No standby requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Submit a request above when your preferred date is fully booked.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map(req => {
              const config = statusConfig[req.status] || statusConfig.Waiting;
              const StatusIcon = config.icon;
              return (
                <Card key={req.id} className="border-border/50 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
                          <StatusIcon className={cn('w-5 h-5', config.color)} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground">{req.patient_name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {new Date(req.preferred_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {req.assigned_time && (
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <Clock className="w-3 h-3" />
                                Assigned: {formatTime(req.assigned_time)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Reason: {req.reason}</p>
                          {req.admin_notes && (
                            <p className="text-xs text-secondary mt-1">Staff note: {req.admin_notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Badge variant={statusBadge(req.status)}>{req.status}</Badge>
                        {req.status === 'Waiting' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            onClick={() => setCancelId(req.id)}
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel standby request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this standby request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        description={successModal.description}
        onClose={() => setSuccessModal({ open: false, title: '', description: '' })}
      />
    </div>
  );
}
