import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Calendar as CalendarIcon, AlertTriangle, Trash2, Plus, Minus, Infinity as InfinityIcon, Users, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { clinicSettingsAPI, scheduleOverridesAPI } from '@/lib/api';
import { TimePicker } from '@/components/shared/TimePicker';
import type { ClinicSchedule as Schedule, ClinicScheduleDay, ScheduleOverride } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

const DAYS = [
  { key: 'sunday', label: 'Sunday' }, { key: 'monday', label: 'Monday' }, { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' }, { key: 'thursday', label: 'Thursday' }, { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
];

const DEFAULT_DAY: ClinicScheduleDay = {
  is_open: true, open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00',
  doctors_count: 2, max_per_slot: 2, max_daily: null,
};

interface CapacityValue {
  doctors_count?: number | null;
  max_per_slot?: number | null;
  max_daily?: number | null;
}

function CapacityRow({ value, onChange, dense }: { value: CapacityValue; onChange: (v: CapacityValue) => void; dense?: boolean }) {
  const doctors = value.doctors_count ?? 1;
  const perSlot = value.max_per_slot ?? doctors;
  const dailyUnlimited = value.max_daily === null || value.max_daily === undefined;

  const stepper = (
    label: string,
    icon: React.ReactNode,
    val: number,
    onSet: (n: number) => void,
    min = 1,
    max = 50,
  ) => (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-tight text-muted-foreground flex items-center gap-1">{icon}{label}</Label>
      <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
        <button type="button" className="px-2 py-1.5 hover:bg-muted/60 text-foreground transition-colors" onClick={() => onSet(Math.max(min, val - 1))} aria-label={`Decrease ${label}`}><Minus className="w-3 h-3" /></button>
        <input
          type="number"
          inputMode="numeric"
          className="w-10 text-center bg-transparent text-sm font-semibold tabular-nums focus:outline-none"
          value={val}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onSet(Math.min(max, Math.max(min, n)));
          }}
        />
        <button type="button" className="px-2 py-1.5 hover:bg-muted/60 text-foreground transition-colors" onClick={() => onSet(Math.min(max, val + 1))} aria-label={`Increase ${label}`}><Plus className="w-3 h-3" /></button>
      </div>
    </div>
  );

  return (
    <div className={cn('grid gap-3', dense ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-3')}>
      {stepper('Doctors', <Users className="w-3 h-3" />, doctors, (n) => {
        // Auto-sync max_per_slot when it was previously equal to doctors
        const sync = (value.max_per_slot == null) || value.max_per_slot === doctors;
        onChange({ ...value, doctors_count: n, max_per_slot: sync ? n : value.max_per_slot });
      })}
      {stepper('Max / slot', <InfinityIcon className="w-3 h-3" />, perSlot, (n) => onChange({ ...value, max_per_slot: n }))}
      <div className="space-y-1">
        <Label className="text-[11px] uppercase tracking-tight text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3 h-3" />Daily cap</Label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...value, max_daily: dailyUnlimited ? 20 : null })}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors',
              dailyUnlimited ? 'bg-mint border-secondary/30 text-secondary' : 'border-border text-muted-foreground hover:bg-muted/40',
            )}
            title="Toggle unlimited daily cap"
          >
            <InfinityIcon className="w-3 h-3" /> {dailyUnlimited ? 'Unlimited' : 'Limit'}
          </button>
          {!dailyUnlimited && (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              className="w-16 rounded-md border border-border px-2 py-1.5 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-secondary/40"
              value={value.max_daily ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) onChange({ ...value, max_daily: Math.max(1, Math.min(500, n)) });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function ClinicSchedule() {
  const [schedule, setSchedule] = useState<Schedule>({});
  const [originalSchedule, setOriginalSchedule] = useState<Schedule>({});
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOverride, setEditOverride] = useState<ScheduleOverride | null>(null);
  const [overrideDate, setOverrideDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [sched, ovrs] = await Promise.all([
          clinicSettingsAPI.fetchSchedule(),
          scheduleOverridesAPI.list(),
        ]);
        const init: Schedule = {};
        DAYS.forEach(d => { init[d.key] = sched?.[d.key] ? { ...DEFAULT_DAY, ...sched[d.key] } : { ...DEFAULT_DAY }; });
        setSchedule(init);
        setOriginalSchedule(JSON.parse(JSON.stringify(init)));
        setOverrides(ovrs);
      } catch (err) {
        console.error('Schedule load error', err);
        toast({ title: 'Error', description: 'Failed to load clinic schedule', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const isDirty = useMemo(() => JSON.stringify(schedule) !== JSON.stringify(originalSchedule), [schedule, originalSchedule]);

  const updateDay = useCallback((key: string, patch: Partial<ClinicScheduleDay>) => {
    setSchedule(prev => ({ ...prev, [key]: { ...DEFAULT_DAY, ...prev[key], ...patch } }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await clinicSettingsAPI.upsertSchedule(schedule);
      setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));
      toast({ title: 'Saved', description: 'Weekly clinic hours updated.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save schedule', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setSchedule(JSON.parse(JSON.stringify(originalSchedule)));

  const startNewOverride = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setOverrideDate(todayStr);
    setEditOverride({ override_date: todayStr, is_open: true, open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', reason: '' });
  };
  const editExisting = (o: ScheduleOverride) => { setOverrideDate(o.override_date); setEditOverride({ ...o }); };

  const saveOverride = async () => {
    if (!editOverride || !overrideDate) return;
    try {
      const payload: ScheduleOverride = {
        ...editOverride,
        override_date: overrideDate,
        is_open: !!editOverride.is_open,
        reason: (editOverride.reason || '').trim() || null,
      };
      const saved = await scheduleOverridesAPI.upsert(payload);
      setOverrides(prev => {
        const without = prev.filter(o => o.override_date !== saved.override_date);
        return [...without, saved].sort((a, b) => a.override_date.localeCompare(b.override_date));
      });
      setEditOverride(null);
      toast({ title: 'Saved', description: `Override saved for ${saved.override_date}` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save override', variant: 'destructive' });
    }
  };
  const removeOverride = async (date: string) => {
    if (!confirm(`Remove override for ${date}?`)) return;
    try {
      await scheduleOverridesAPI.remove(date);
      setOverrides(prev => prev.filter(o => o.override_date !== date));
      toast({ title: 'Removed', description: `Override for ${date} removed.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to remove override', variant: 'destructive' });
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        icon={CalendarClock}
        title="Clinic Schedule"
        description="Weekly hours, break, and per-day booking capacity. Capacity changes apply immediately."
        actions={(
          <div className="flex gap-2">
            {isDirty && <Button variant="outline" onClick={handleReset}>Reset</Button>}
            <Button onClick={handleSave} disabled={!isDirty || saving} className="gap-2"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DAYS.map(d => {
          const day = schedule[d.key] || DEFAULT_DAY;
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === d.key;
          return (
            <Card key={d.key} className={cn(
              'border-border/60 transition-all duration-200 overflow-hidden',
              !day.is_open && 'bg-muted/30',
              today && 'ring-1 ring-secondary/30 border-secondary/40 shadow-sm',
            )}>
              <CardHeader className={cn('pb-3 border-b border-border/40', day.is_open ? 'bg-gradient-to-br from-mint/40 to-transparent' : 'bg-muted/30')}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-lg ring-1', day.is_open ? 'bg-card text-secondary ring-secondary/15' : 'bg-muted text-muted-foreground ring-border/40')}>
                      <CalendarIcon className="w-3.5 h-3.5" />
                    </span>
                    {d.label}
                    {today && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">Today</span>}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className={cn('text-xs font-medium', day.is_open ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                      {day.is_open ? 'Open' : 'Closed'}
                    </Label>
                    <Switch checked={day.is_open} onCheckedChange={(c) => updateDay(d.key, { is_open: c })} />
                  </div>
                </div>
              </CardHeader>
              {day.is_open && (
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Open</Label>
                      <TimePicker value={day.open_time} onChange={(v) => updateDay(d.key, { open_time: v })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Close</Label>
                      <TimePicker value={day.close_time} onChange={(v) => updateDay(d.key, { close_time: v })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Break Start</Label>
                      <TimePicker value={day.break_start} onChange={(v) => updateDay(d.key, { break_start: v })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Break End</Label>
                      <TimePicker value={day.break_end} onChange={(v) => updateDay(d.key, { break_end: v })} />
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-tight">Capacity</p>
                    <CapacityRow
                      value={{
                        doctors_count: day.doctors_count ?? 1,
                        max_per_slot: day.max_per_slot ?? day.doctors_count ?? 1,
                        max_daily: day.max_daily ?? null,
                      }}
                      onChange={(v) => updateDay(d.key, v)}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Overrides */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-br from-mint/40 to-transparent border-b border-border/40">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-card text-secondary ring-1 ring-secondary/15">
                <CalendarIcon className="w-4 h-4" />
              </span>
              Date Overrides
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 ml-12">Override a specific date's hours, status or capacity (e.g., holidays).</p>
          </div>
          <Button onClick={startNewOverride} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
        </CardHeader>
        <CardContent className="pt-4">
          {overrides.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No date overrides configured"
              description="Add an override for holidays or special days."
              tone="muted"
            />
          ) : (
            <div className="space-y-2">
              {overrides.map(o => (
                <div key={o.override_date} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card hover:border-secondary/30 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn(
                      'inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ring-1',
                      o.is_open ? 'bg-mint text-secondary ring-secondary/15' : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-800',
                    )}>
                      <CalendarIcon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{new Date(o.override_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.is_open
                          ? `Open ${o.open_time?.slice(0, 5) || '09:00'}\u2013${o.close_time?.slice(0, 5) || '17:00'}`
                          : 'Closed'}
                        {o.reason && ` \u2022 ${o.reason}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!o.is_open && <Badge variant="destructive">Closed</Badge>}
                    {(o.doctors_count || o.max_per_slot || o.max_daily != null) && (
                      <Badge variant="outline" className="text-[10px]">
                        {o.doctors_count ? `${o.doctors_count}d` : ''}
                        {o.max_per_slot ? ` ${o.max_per_slot}/slot` : ''}
                        {o.max_daily != null ? ` cap ${o.max_daily}` : ''}
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => editExisting(o)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => o.override_date && removeOverride(o.override_date)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editOverride} onOpenChange={(open) => !open && setEditOverride(null)}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editOverride && overrides.find(o => o.override_date === editOverride.override_date) ? 'Edit Override' : 'Add Override'}</SheetTitle>
            <SheetDescription>Configure a one-off hours/closure/capacity for a single date.</SheetDescription>
          </SheetHeader>
          {editOverride && (
            <div className="py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <div>
                  <Label className="text-sm font-medium">Clinic Open</Label>
                  <p className="text-xs text-muted-foreground">Toggle off to close the clinic for this date.</p>
                </div>
                <Switch checked={!!editOverride.is_open} onCheckedChange={(c) => setEditOverride({ ...editOverride, is_open: c })} />
              </div>
              {editOverride.is_open && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Open</Label><TimePicker value={editOverride.open_time || '09:00'} onChange={(v) => setEditOverride({ ...editOverride, open_time: v })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Close</Label><TimePicker value={editOverride.close_time || '17:00'} onChange={(v) => setEditOverride({ ...editOverride, close_time: v })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Break Start</Label><TimePicker value={editOverride.break_start || '12:00'} onChange={(v) => setEditOverride({ ...editOverride, break_start: v })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Break End</Label><TimePicker value={editOverride.break_end || '13:00'} onChange={(v) => setEditOverride({ ...editOverride, break_end: v })} /></div>
                  </div>
                  <div className="border-t border-border/40 pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-tight">Capacity (optional)</p>
                    <CapacityRow
                      value={{
                        doctors_count: editOverride.doctors_count ?? null,
                        max_per_slot: editOverride.max_per_slot ?? null,
                        max_daily: editOverride.max_daily ?? null,
                      }}
                      onChange={(v) => setEditOverride({ ...editOverride, ...v })}
                      dense
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">Leave blank values to inherit from the weekday defaults.</p>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Reason / Note (optional)</Label>
                <Textarea value={editOverride.reason || ''} onChange={(e) => setEditOverride({ ...editOverride, reason: e.target.value })} placeholder="e.g. Public holiday, training day" rows={3} />
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-warning/10 border border-warning/30 rounded-md p-3">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span>Overrides take priority over weekly hours for the chosen date. Existing approved bookings are not auto-cancelled.</span>
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOverride(null)}>Cancel</Button>
            <Button onClick={saveOverride} disabled={!overrideDate}>Save Override</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ClinicSchedule;
