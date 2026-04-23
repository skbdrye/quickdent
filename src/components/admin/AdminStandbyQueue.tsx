import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStandbyStore, useClinicStore, useAppointmentsStore } from '@/lib/store';
import { notificationsAPI, scheduleOverridesAPI, getEffectiveDay, generateDaySlots } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Clock, Search, Filter, CalendarDays, User, CheckCircle2, XCircle, Timer, Loader2 } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import type { ScheduleOverride } from '@/lib/types';

interface AdminStandbyQueueProps {
  highlightId?: number | null;
  highlightKey?: number;
}

export default function AdminStandbyQueue({ highlightId, highlightKey }: AdminStandbyQueueProps = {}) {
  const { toast } = useToast();
  const { requests, fetchAll, updateStatus, isLoading } = useStandbyStore();
  const { schedule, fetchSchedule } = useClinicStore();
  const { fetchBookedSlots } = useAppointmentsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignDialog, setAssignDialog] = useState<{ id: number; userId: string; name: string; date: string } | null>(null);
  const [assignTime, setAssignTime] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [denyDialog, setDenyDialog] = useState<{ id: number; userId: string; name: string } | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [highlighting, setHighlighting] = useState<number | null>(null);

  useEffect(() => {
    fetchAll();
    fetchSchedule();
    scheduleOverridesAPI.list().then(setOverrides).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight a specific request when triggered by notification
  useEffect(() => {
    if (highlightId && highlightKey && highlightKey > 0 && requests.length > 0) {
      setHighlighting(highlightId);
      setTimeout(() => {
        const el = document.querySelector(`[data-admin-standby-id="${highlightId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      const t = setTimeout(() => setHighlighting(null), 4000);
      return () => clearTimeout(t);
    }
  }, [highlightId, highlightKey, requests.length]);

  // Whenever the assign dialog opens, fetch booked slots for that date so we can show conflicts
  useEffect(() => {
    if (assignDialog?.date) {
      fetchBookedSlots(assignDialog.date).then(setBookedTimes).catch(() => setBookedTimes([]));
    } else {
      setBookedTimes([]);
    }
  }, [assignDialog?.date, fetchBookedSlots]);

  const slotOptions = useMemo(() => {
    if (!assignDialog?.date) return [] as string[];
    const eff = getEffectiveDay(assignDialog.date, schedule, overrides);
    return generateDaySlots(eff.day, 30);
  }, [assignDialog?.date, schedule, overrides]);

  const filtered = useMemo(() => {
    return requests
      .filter(r => {
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        if (!searchQuery) return matchesStatus;
        const q = searchQuery.toLowerCase();
        const matchesSearch = r.patient_name.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const statusOrder: Record<string, number> = { 'Waiting': 0, 'Confirmed': 1, 'Expired': 2, 'Cancelled': 3 };
        const sd = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        if (sd !== 0) return sd;
        return b.preferred_date.localeCompare(a.preferred_date);
      });
  }, [requests, statusFilter, searchQuery]);

  const handleConfirm = async () => {
    if (!assignDialog || !assignTime) {
      toast({ title: 'Missing Time', description: 'Please assign a time slot.', variant: 'destructive' });
      return;
    }
    if (bookedTimes.includes(assignTime)) {
      toast({ title: 'Slot already taken', description: 'Pick a different time — that slot is already booked.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updateStatus(assignDialog.id, 'Confirmed', adminNotes || undefined, assignTime);

      // Notify the patient
      await notificationsAPI.create({
        user_id: assignDialog.userId,
        title: 'Standby Slot Confirmed',
        message: `Great news! A slot has been assigned for your standby request. Your assigned time is ${formatTime(assignTime)}.${adminNotes ? ` Note: ${adminNotes}` : ''}`,
        type: 'standby',
        related_id: assignDialog.id,
      });

      toast({ title: 'Confirmed', description: `Slot assigned to ${assignDialog.name} at ${formatTime(assignTime)}.` });
      setAssignDialog(null);
      setAssignTime('');
      setAdminNotes('');
    } catch {
      toast({ title: 'Error', description: 'Failed to confirm request.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDeny = async () => {
    if (!denyDialog) return;
    setSaving(true);
    try {
      await updateStatus(denyDialog.id, 'Expired', denyReason || undefined);
      await notificationsAPI.create({
        user_id: denyDialog.userId,
        title: 'Standby Request Closed',
        message: `Your standby request was closed by the clinic.${denyReason ? `\nReason: ${denyReason}` : ''}`,
        type: 'standby',
        related_id: denyDialog.id,
      });
      toast({ title: 'Request closed', description: `Patient notified.` });
      setDenyDialog(null);
      setDenyReason('');
    } catch {
      toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleExpire = async (id: number) => {
    try {
      await updateStatus(id, 'Expired');
      toast({ title: 'Expired', description: 'Request marked as expired.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
    }
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Standby Queue</h1>
        <p className="text-muted-foreground">Manage walk-in and standby patient requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by patient or reason..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Waiting">Waiting</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-foreground">No standby requests</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== 'all' ? 'Try changing the filter' : 'Patients will appear here when they request standby slots'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <Card
              key={req.id}
              data-admin-standby-id={req.id}
              className={cn(
                'border-border/50 transition-all duration-300',
                highlighting === req.id && 'ring-2 ring-secondary ring-offset-2 shadow-md',
              )}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">{req.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{req.contact}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
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
                      <p className="text-xs text-muted-foreground mt-1.5">
                        <strong className="text-foreground">Reason:</strong> {req.reason}
                      </p>
                      {req.admin_notes && (
                        <p className="text-xs text-secondary mt-0.5">Note: {req.admin_notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                    <Badge variant={statusBadge(req.status)}>{req.status}</Badge>
                    {req.status === 'Waiting' && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                          onClick={() => setAssignDialog({ id: req.id, userId: req.user_id, name: req.patient_name, date: req.preferred_date })}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Assign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          onClick={() => setDenyDialog({ id: req.id, userId: req.user_id, name: req.patient_name })}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Deny
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Time Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setAssignTime(''); setAdminNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Slot to {assignDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-mint/40 px-3 py-2 text-xs text-foreground">
              <CalendarDays className="inline w-3 h-3 mr-1" />
              Date: {assignDialog?.date && new Date(assignDialog.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div>
              <Label>Assigned Time *</Label>
              {slotOptions.length > 0 ? (
                <Select value={assignTime} onValueChange={setAssignTime}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Pick from clinic hours..." />
                  </SelectTrigger>
                  <SelectContent>
                    {slotOptions.map(t => {
                      const taken = bookedTimes.includes(t);
                      return (
                        <SelectItem key={t} value={t} disabled={taken}>
                          {formatTime(t)} {taken && <span className="text-muted-foreground ml-2 text-xs">(booked)</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="mt-1.5 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  No clinic hours configured for this date. Falling back to free-form time:
                  <Input type="time" value={assignTime} onChange={(e) => setAssignTime(e.target.value)} className="mt-2" />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">Slots already taken by confirmed appointments are disabled.</p>
            </div>
            <div>
              <Label>Admin Notes (optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Any additional notes for the patient..."
                className="mt-1.5 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialog(null); setAssignTime(''); setAdminNotes(''); }}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={saving || !assignTime} className="gap-1.5">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Confirm & Notify</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={!!denyDialog} onOpenChange={(open) => { if (!open) { setDenyDialog(null); setDenyReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny request for {denyDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Reason (will be sent to the patient)</Label>
              <Textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="e.g. No slot likely to open up that day."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDenyDialog(null); setDenyReason(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Deny & Notify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
