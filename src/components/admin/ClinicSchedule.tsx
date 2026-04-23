import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Clock, Copy, CalendarPlus, Pencil, Trash2, AlertTriangle, CalendarOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scheduleOverridesAPI } from '@/lib/api';
import type { ScheduleOverride } from '@/lib/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DaySchedule {
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
}

type WeekSchedule = Record<string, DaySchedule>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const defaultSchedule: WeekSchedule = {
  '0': { is_open: false, open_time: '08:00', close_time: '19:00', break_start: '12:00', break_end: '13:00' },
  '1': { is_open: true, open_time: '08:00', close_time: '19:00', break_start: '12:00', break_end: '13:00' },
  '2': { is_open: true, open_time: '08:00', close_time: '19:00', break_start: '12:00', break_end: '13:00' },
  '3': { is_open: true, open_time: '08:00', close_time: '19:00', break_start: '12:00', break_end: '13:00' },
  '4': { is_open: true, open_time: '08:00', close_time: '19:00', break_start: '12:00', break_end: '13:00' },
  '5': { is_open: true, open_time: '08:00', close_time: '19:00', break_start: '12:00', break_end: '13:00' },
  '6': { is_open: true, open_time: '08:00', close_time: '19:00', break_start: '12:00', break_end: '13:00' },
};

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function ClinicSchedule() {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<WeekSchedule>(defaultSchedule);
  const [originalSchedule, setOriginalSchedule] = useState<WeekSchedule>(defaultSchedule);
  const [saving, setSaving] = useState(false);

  // Schedule overrides state
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [overrideDialog, setOverrideDialog] = useState<ScheduleOverride | null>(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [confirmDeleteOverride, setConfirmDeleteOverride] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
    scheduleOverridesAPI.list().then(setOverrides).catch(() => {});
  }, []);

  async function loadSchedule() {
    const { data } = await supabase
      .from('clinic_settings')
      .select('setting_value')
      .eq('setting_key', 'schedule')
      .maybeSingle();
    if (data?.setting_value) {
      const loaded = data.setting_value as unknown as WeekSchedule;
      setSchedule(loaded);
      setOriginalSchedule(loaded);
    }
  }

  const hasChanges = useMemo(() => {
    return JSON.stringify(schedule) !== JSON.stringify(originalSchedule);
  }, [schedule, originalSchedule]);

  async function saveSchedule() {
    if (!hasChanges) return;
    setSaving(true);

    const { data: existing } = await supabase
      .from('clinic_settings')
      .select('id')
      .eq('setting_key', 'schedule')
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('clinic_settings')
        .update({ setting_value: JSON.parse(JSON.stringify(schedule)), updated_at: new Date().toISOString() })
        .eq('setting_key', 'schedule');
      error = result.error;
    } else {
      const result = await supabase
        .from('clinic_settings')
        .insert([{ setting_key: 'schedule', setting_value: JSON.parse(JSON.stringify(schedule)) }]);
      error = result.error;
    }

    if (error) {
      toast({ title: 'Error', description: 'Failed to save schedule', variant: 'destructive' });
    } else {
      setOriginalSchedule(schedule);
      toast({ title: 'Saved', description: 'Clinic schedule updated successfully' });
    }
    setSaving(false);
  }

  function updateDay(dayIndex: string, field: keyof DaySchedule, value: string | boolean) {
    setSchedule((prev) => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
  }

  function applyToAllOpen(sourceDayKey: string) {
    const sourceDay = schedule[sourceDayKey];
    setSchedule((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        if (updated[key].is_open) {
          updated[key] = { ...updated[key], open_time: sourceDay.open_time, close_time: sourceDay.close_time, break_start: sourceDay.break_start, break_end: sourceDay.break_end };
        }
      }
      return updated;
    });
    toast({ title: 'Applied', description: 'Hours applied to all open days' });
  }

  const openDaysCount = Object.values(schedule).filter(d => d.is_open).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clinic Schedule</h1>
          <p className="text-muted-foreground">Abrigo-Marabe Dental Clinic operating hours</p>
        </div>
        <Button onClick={saveSchedule} disabled={saving || !hasChanges} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Quick Overview */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium text-foreground">Weekly Overview</span>
            <span className="text-xs text-muted-foreground ml-auto">{openDaysCount} days open</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {DAY_SHORT.map((name, index) => {
              const day = schedule[String(index)];
              return (
                <div key={index} className={cn(
                  'text-center rounded-lg p-2 text-xs font-medium transition-colors',
                  day.is_open ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                )}>
                  <div>{name}</div>
                  {day.is_open && <div className="text-[10px] mt-0.5 opacity-70">{formatTime(day.open_time)}-{formatTime(day.close_time)}</div>}
                  {!day.is_open && <div className="text-[10px] mt-0.5">Closed</div>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Cards */}
      <div className="space-y-3">
        {DAY_NAMES.map((name, index) => {
          const dayKey = String(index);
          const day = schedule[dayKey];
          return (
            <Card key={dayKey} className={cn(
              'border transition-colors',
              day.is_open ? 'border-border/50' : 'border-border/30 opacity-75'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Switch
                    checked={day.is_open}
                    onCheckedChange={(checked) => updateDay(dayKey, 'is_open', checked)}
                  />
                  <span className={cn('font-semibold text-sm', day.is_open ? 'text-foreground' : 'text-muted-foreground')}>
                    {name}
                  </span>
                  {day.is_open && (
                    <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">Open</span>
                  )}
                  {!day.is_open && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Closed</span>
                  )}
                  {day.is_open && (
                    <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs gap-1 text-muted-foreground" onClick={() => applyToAllOpen(dayKey)} title="Apply this day's hours to all open days">
                      <Copy className="w-3 h-3" /> Apply to all
                    </Button>
                  )}
                </div>

                {day.is_open && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-10">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium">Operating Hours</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={day.open_time}
                          onChange={(e) => updateDay(dayKey, 'open_time', e.target.value)}
                          className="h-9"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          value={day.close_time}
                          onChange={(e) => updateDay(dayKey, 'close_time', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium">Break Time</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={day.break_start}
                          onChange={(e) => updateDay(dayKey, 'break_start', e.target.value)}
                          className="h-9"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          value={day.break_end}
                          onChange={(e) => updateDay(dayKey, 'break_end', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Schedule Overrides (per-date) */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-secondary" />
            <span className="text-sm font-semibold text-foreground">Date Overrides</span>
            <span className="text-xs text-muted-foreground">— close the clinic or set special hours for a specific date.</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-8 gap-1.5"
              onClick={() => setOverrideDialog({
                override_date: new Date().toISOString().slice(0, 10),
                is_open: false,
                open_time: '08:00',
                close_time: '17:00',
                break_start: '12:00',
                break_end: '13:00',
                reason: '',
              })}
            >
              <CalendarPlus className="w-3.5 h-3.5" /> Add override
            </Button>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-[11px] text-amber-800 flex items-start gap-1.5 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>Overrides do <strong>not</strong> auto-cancel existing appointments — please reach out to affected patients.</p>
          </div>

          {overrides.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No overrides set. Add one to mark a holiday or change hours for a specific date.</p>
          ) : (
            <div className="space-y-2">
              {overrides.map(o => (
                <div key={o.override_date} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:border-secondary/60 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-mint flex items-center justify-center text-mint-foreground shrink-0">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(o.override_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {o.is_open ? (
                        <Badge variant="confirmed">{formatTime(o.open_time || '08:00')} - {formatTime(o.close_time || '17:00')}</Badge>
                      ) : (
                        <Badge variant="cancelled">Closed</Badge>
                      )}
                    </div>
                    {o.reason && <p className="text-xs text-muted-foreground truncate">{o.reason}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOverrideDialog(o)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmDeleteOverride(o.override_date)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Override Edit Dialog */}
      {overrideDialog && (
        <Dialog open onOpenChange={(o) => !o && setOverrideDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Schedule override</DialogTitle>
              <DialogDescription className="text-xs">Apply special hours or close the clinic on a single date.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={overrideDialog.override_date}
                  onChange={e => setOverrideDialog({ ...overrideDialog, override_date: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Clinic open this day?</p>
                  <p className="text-[11px] text-muted-foreground">Toggle off for holidays / closures.</p>
                </div>
                <Switch
                  checked={overrideDialog.is_open}
                  onCheckedChange={(c) => setOverrideDialog({ ...overrideDialog, is_open: c })}
                />
              </div>
              {overrideDialog.is_open && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Open time</Label>
                    <Input type="time" value={overrideDialog.open_time || ''} onChange={e => setOverrideDialog({ ...overrideDialog, open_time: e.target.value })} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Close time</Label>
                    <Input type="time" value={overrideDialog.close_time || ''} onChange={e => setOverrideDialog({ ...overrideDialog, close_time: e.target.value })} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Break start</Label>
                    <Input type="time" value={overrideDialog.break_start || ''} onChange={e => setOverrideDialog({ ...overrideDialog, break_start: e.target.value })} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Break end</Label>
                    <Input type="time" value={overrideDialog.break_end || ''} onChange={e => setOverrideDialog({ ...overrideDialog, break_end: e.target.value })} className="mt-1 h-9" />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Reason (shown to patients on hover)</Label>
                <Input
                  placeholder="e.g. Holiday, Staff training"
                  value={overrideDialog.reason || ''}
                  onChange={e => setOverrideDialog({ ...overrideDialog, reason: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOverrideDialog(null)}>Cancel</Button>
              <Button
                disabled={overrideSaving || !overrideDialog.override_date}
                onClick={async () => {
                  setOverrideSaving(true);
                  try {
                    await scheduleOverridesAPI.upsert(overrideDialog);
                    const fresh = await scheduleOverridesAPI.list();
                    setOverrides(fresh);
                    toast({ title: 'Saved', description: 'Override updated.' });
                    setOverrideDialog(null);
                  } catch {
                    toast({ title: 'Could not save', variant: 'destructive' });
                  }
                  setOverrideSaving(false);
                }}
              >
                {overrideSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save override'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!confirmDeleteOverride} onOpenChange={(o) => !o && setConfirmDeleteOverride(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this override?</AlertDialogTitle>
            <AlertDialogDescription>
              The clinic schedule will revert to the regular weekly hours for this date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDeleteOverride) return;
                try {
                  await scheduleOverridesAPI.delete(confirmDeleteOverride);
                  setOverrides(prev => prev.filter(p => p.override_date !== confirmDeleteOverride));
                  toast({ title: 'Removed' });
                } catch {
                  toast({ title: 'Could not remove', variant: 'destructive' });
                }
                setConfirmDeleteOverride(null);
              }}
            >
              Yes, remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
