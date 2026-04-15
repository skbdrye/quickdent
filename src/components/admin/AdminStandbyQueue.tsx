import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStandbyStore } from '@/lib/store';
import { notificationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Clock, Search, Filter, CalendarDays, User, CheckCircle2, XCircle, Timer, Loader2 } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';

export default function AdminStandbyQueue() {
  const { toast } = useToast();
  const { requests, fetchAll, updateStatus, isLoading } = useStandbyStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignDialog, setAssignDialog] = useState<{ id: number; userId: string; name: string } | null>(null);
  const [assignTime, setAssignTime] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setSaving(true);
    try {
      await updateStatus(assignDialog.id, 'Confirmed', adminNotes || undefined, assignTime);

      // Notify the patient
      await notificationsAPI.create({
        user_id: assignDialog.userId,
        title: 'Standby Slot Confirmed',
        message: `Great news! A slot has been assigned for your standby request. Your assigned time is ${formatTime(assignTime)}.${adminNotes ? ` Note: ${adminNotes}` : ''}`,
        type: 'standby',
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
            <Card key={req.id} className="border-border/50">
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
                          onClick={() => setAssignDialog({ id: req.id, userId: req.user_id, name: req.patient_name })}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Assign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-gray-500 border-gray-200 hover:bg-gray-50"
                          onClick={() => handleExpire(req.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Expire
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
            <div>
              <Label>Assigned Time *</Label>
              <Input type="time" value={assignTime} onChange={(e) => setAssignTime(e.target.value)} className="mt-1.5" />
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
    </div>
  );
}
