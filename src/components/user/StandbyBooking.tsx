import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthStore, useStandbyStore, useProfileStore } from '@/lib/store';
import { notificationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { SuccessModal } from '@/components/shared/SuccessModal';
import { Clock, CalendarDays, AlertTriangle, Loader2, X, CheckCircle2, Timer, Ban } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function StandbyBooking() {
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useProfileStore();
  const { requests, fetchByUser, addRequest, cancelRequest, isLoading } = useStandbyStore();
  const { toast } = useToast();

  const [preferredDate, setPreferredDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });

  useEffect(() => {
    if (user?.id) {
      fetchByUser(user.id);
      fetchProfile(user.id);
    }
  }, [user?.id, fetchByUser, fetchProfile]);

  const today = new Date().toISOString().split('T')[0];

  const patientName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || user?.username || ''
    : user?.username || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !preferredDate || !reason.trim()) {
      toast({ title: 'Missing Fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    if (preferredDate < today) {
      toast({ title: 'Invalid Date', description: 'Please select today or a future date.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await addRequest({
        user_id: user.id,
        patient_name: patientName,
        contact: user.phone,
        preferred_date: preferredDate,
        reason: reason.trim(),
        status: 'Waiting',
      });

      await notificationsAPI.notifyAdmins(
        'New Standby Request',
        `${patientName} has requested a standby slot for ${preferredDate}.\n\nReason: ${reason.trim()}`,
        'standby'
      );

      setSuccessModal({
        open: true,
        title: 'Standby Request Submitted',
        description: 'Your request has been submitted. You will be notified if a slot becomes available.',
      });

      setPreferredDate('');
      setReason('');
    } catch {
      toast({ title: 'Error', description: 'Failed to submit request. Please try again.', variant: 'destructive' });
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

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Standby / Walk-in Queue</h1>
        <p className="text-muted-foreground">Request a slot when the schedule is fully booked</p>
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/80 space-y-1">
              <p className="font-semibold text-foreground">How it works</p>
              <ul className="space-y-0.5 text-xs">
                <li>Use this when no available time slots are left for your preferred date.</li>
                <li>Fill in your preferred date and reason. Staff will assign a time if a slot opens up (e.g., due to cancellation or early finish).</li>
                <li><strong className="text-foreground">There is no guarantee</strong> that a slot will become available.</li>
                <li>You will receive a notification if your request is confirmed.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Form */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-4">New Standby Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Patient Name</Label>
              <Input value={patientName} disabled className="mt-1.5 bg-muted" />
            </div>
            <div>
              <Label>Preferred Date *</Label>
              <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} min={today} className="mt-1.5" />
            </div>
            <div>
              <Label>Reason / Notes *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe your dental concern or reason for the visit..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <Button type="submit" disabled={submitting || !preferredDate || !reason.trim()} className="gap-1.5">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Clock className="w-4 h-4" /> Submit Standby Request</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Requests */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">My Standby Requests</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-10 text-center">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium text-foreground">No standby requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Submit a request above when the schedule is fully booked</p>
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
                          <p className="font-semibold text-sm text-foreground">Standby Request</p>
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
            <AlertDialogTitle>Cancel Standby Request?</AlertDialogTitle>
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
              Yes, Cancel
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
