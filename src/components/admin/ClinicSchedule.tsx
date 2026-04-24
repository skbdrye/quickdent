/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useClinicStore } from '@/lib/store';
import { scheduleOverridesAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TimePicker, formatDisplay as fmtTime12 } from '@/components/shared/TimePicker';
import {
  Clock, Save, CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight, CalendarOff, Sparkles,
} from 'lucide-react';
import type { ClinicSchedule, ClinicScheduleDay, ScheduleOverride } from '@/lib/types';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  { key: 'sunday', short: 'Sun', label: 'Sunday' },
  { key: 'monday', short: 'Mon', label: 'Monday' },
  { key: 'tuesday', short: 'Tue', label: 'Tuesday' },
  { key: 'wednesday', short: 'Wed', label: 'Wednesday' },
  { key: 'thursday', short: 'Thu', label: 'Thursday' },
  { key: 'friday', short: 'Fri', label: 'Friday' },
  { key: 'saturday', short: 'Sat', label: 'Saturday' },
] as const;

type DayKey = typeof DAYS_OF_WEEK[number]['key'];

const DEFAULT_DAY: ClinicScheduleDay = {
  is_open: true,
  open_time: '09:00',
  close_time: '17:00',
  break_start: '12:00',
  break_end: '13:00',
};

const emptyOverrideDraft = {
  override_date: '',
  is_open: true,
  open_time: '09:00',
  close_time: '17:00',
  break_start: '12:00',
  break_end: '13:00',
  reason: '',
};

function fmtDateLong(date: string) {
  try {
    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return date;
  }
}

export default function ClinicSchedule() {
  const { schedule, fetchSchedule, updateSchedule } = useClinicStore();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ClinicSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  // Overrides state
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDraft, setOverrideDraft] = useState({ ...emptyOverrideDraft });
  const [overrideEditId, setOverrideEditId] = useState<number | null>(null);
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  // Calendar month view state
  const [calMonth, setCalMonth] = useState(() => new Date());

  useEffect(() => { fetchSchedule(); refreshOverrides(); }, [fetchSchedule]);
  useEffect(() => { if (schedule) setDraft(schedule); }, [schedule]);

  async function refreshOverrides() {
    try {
      const list = await scheduleOverridesAPI.list();
      setOverrides(list);
    } catch (err) {
      console.error('Failed to load overrides', err);
    }
  }

  function updateDay(day: DayKey, patch: Partial<ClinicScheduleDay>) {
    setDraft(prev => prev ? { ...prev, [day]: { ...(prev[day] || DEFAULT_DAY), ...patch } } : prev);
  }

  async function handleSaveWeekly() {
    if (!draft) return;
    setSaving(true);
    try {
      await updateSchedule(draft);
      toast({ title: 'Saved', description: 'Weekly schedule updated successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Could not save schedule.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function openCreateOverride(date: string) {
    setOverrideEditId(null);
    setOverrideDraft({ ...emptyOverrideDraft, override_date: date });
    setOverrideOpen(true);
  }

  function openEditOverride(o: ScheduleOverride) {
    setOverrideEditId(o.id);
    setOverrideDraft({
      override_date: o.override_date,
      is_open: o.is_open,
      open_time: o.open_time || '09:00',
      close_time: o.close_time || '17:00',
      break_start: o.break_start || '12:00',
      break_end: o.break_end || '13:00',
      reason: o.reason || '',
    });
    setOverrideOpen(true);
  }

  async function saveOverride() {
    if (!overrideDraft.override_date) {
      toast({ title: 'Date required', description: 'Pick a date for this override.', variant: 'destructive' });
      return;
    }
    try {
      const payload = {
        override_date: overrideDraft.override_date,
        is_open: overrideDraft.is_open,
        open_time: overrideDraft.is_open ? overrideDraft.open_time : null,
        close_time: overrideDraft.is_open ? overrideDraft.close_time : null,
        break_start: overrideDraft.is_open ? overrideDraft.break_start : null,
        break_end: overrideDraft.is_open ? overrideDraft.break_end : null,
        reason: overrideDraft.reason || null,
      } as any;
      if (overrideEditId !== null) {
        await scheduleOverridesAPI.upsert(payload);
        toast({ title: 'Updated', description: `Override for ${fmtDateLong(overrideDraft.override_date)} updated.` });
      } else {
        await scheduleOverridesAPI.upsert(payload);
        toast({ title: 'Saved', description: `Override for ${fmtDateLong(overrideDraft.override_date)} saved.` });
      }
      setOverrideOpen(false);
      refreshOverrides();
    } catch (err) {
      const msg = (err as { message?: string } | null)?.message || 'Could not save override.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  async function deleteOverride(date: string) {
    try {
      await scheduleOverridesAPI.delete(date);
      toast({ title: 'Removed', description: 'Override deleted.' });
      setConfirmDeleteDate(null);
      refreshOverrides();
    } catch {
      toast({ title: 'Error', description: 'Could not delete.', variant: 'destructive' });
    }
  }

  const overrideMap = useMemo(() => {
    const m: Record<string, ScheduleOverride> = {};
    for (const o of overrides) m[o.override_date] = o;
    return m;
  }, [overrides]);

  const sortedUpcoming = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...overrides].filter(o => o.override_date >= today).sort((a, b) => a.override_date.localeCompare(b.override_date));
  }, [overrides]);

  // Build month calendar
  const calendarCells = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { date: string | null; day: number | null; weekday: number }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, day: null, weekday: i });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dt = new Date(y, m, d);
      cells.push({ date: dateStr, day: d, weekday: dt.getDay() });
    }
    return cells;
  }, [calMonth]);

  const monthLabel = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().split('T')[0];

  if (!draft) {
    return <div className="p-6 text-muted-foreground text-sm">Loading clinic schedule...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-secondary" />
            Clinic Schedule
          </h1>
          <p className="text-sm text-muted-foreground">Set your weekly hours and add date overrides for holidays or special days.</p>
        </div>
        <Button onClick={handleSaveWeekly} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save weekly hours'}
        </Button>
      </div>

      {/* Weekly Hours - card grid */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-secondary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Weekly Hours</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map(({ key, label, short }) => {
            const day = (draft[key] || DEFAULT_DAY) as ClinicScheduleDay;
            return (
              <Card
                key={key}
                className={cn(
                  'border-border/50 transition-all',
                  day.is_open ? 'shadow-sm hover:shadow-md' : 'bg-muted/30',
                )}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{short}</CardTitle>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">{label}</p>
                  </div>
                  <Switch checked={day.is_open} onCheckedChange={v => updateDay(key, { is_open: v })} />
                </CardHeader>
                <CardContent className="pt-0">
                  {day.is_open ? (
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Open</Label>
                        <TimePicker value={day.open_time || ''} onChange={v => updateDay(key, { open_time: v })} ariaLabel={`${label} open time`} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Close</Label>
                        <TimePicker value={day.close_time || ''} onChange={v => updateDay(key, { close_time: v })} ariaLabel={`${label} close time`} />
                      </div>
                      <Separator />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1"><Clock className="w-3 h-3" /> Break</p>
                      <div className="space-y-1.5">
                        <TimePicker value={day.break_start || ''} onChange={v => updateDay(key, { break_start: v })} ariaLabel={`${label} break start`} />
                        <TimePicker value={day.break_end || ''} onChange={v => updateDay(key, { break_end: v })} ariaLabel={`${label} break end`} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Closed all day</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Calendar overrides */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-secondary" />
                  Date Overrides
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-sm font-medium text-foreground min-w-[8rem] text-center">{monthLabel}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Click any date to add or edit an override.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/70 py-1 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((c, i) => {
                  if (!c.date) return <div key={`e-${i}`} />;
                  const o = overrideMap[c.date];
                  const isToday = c.date === todayStr;
                  const isPast = c.date < todayStr;
                  const isClosed = !!o && !o.is_open;
                  const isCustom = !!o && o.is_open;
                  return (
                    <button
                      key={c.date}
                      type="button"
                      onClick={() => o ? openEditOverride(o) : openCreateOverride(c.date)}
                      className={cn(
                        'relative rounded-lg p-2 min-h-[3.5rem] flex flex-col items-center justify-start text-sm transition-colors text-left border',
                        'hover:border-secondary/50 hover:bg-mint/30',
                        isPast && 'opacity-50',
                        isToday && !o && 'border-secondary',
                        isClosed && 'border-destructive/30 bg-destructive/5 text-destructive',
                        isCustom && 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
                        !o && 'border-transparent',
                      )}
                    >
                      <span className={cn('text-sm font-medium', isToday && !o && 'text-secondary')}>{c.day}</span>
                      {o && (
                        <span className="text-[8px] uppercase tracking-tight font-semibold mt-0.5 leading-tight">
                          {o.is_open ? 'Custom' : 'Closed'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Custom hours</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Closed (override)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-secondary" /> Today</span>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming overrides list */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-secondary" />
                Upcoming
              </CardTitle>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => openCreateOverride(todayStr)}>
                <Plus className="w-3.5 h-3.5" /> New
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
              {sortedUpcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No upcoming overrides.</p>
              ) : (
                sortedUpcoming.map(o => (
                  <div
                    key={o.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors hover:border-secondary/60 cursor-pointer',
                      !o.is_open ? 'border-destructive/20 bg-destructive/5' : 'border-amber-500/20 bg-amber-500/5',
                    )}
                    onClick={() => openEditOverride(o)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{fmtDateLong(o.override_date)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {o.is_open ? `${fmtTime12(o.open_time || '')} – ${fmtTime12(o.close_time || '')}` : 'Closed all day'}
                        </p>
                        {o.reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.reason}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant={o.is_open ? 'pending' : 'destructive'} className="text-[9px]">
                          {o.is_open ? 'Custom' : 'Closed'}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmDeleteDate(o.override_date); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Override editor sheet */}
      <Sheet open={overrideOpen} onOpenChange={setOverrideOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-secondary" />
              {overrideEditId ? 'Edit override' : 'New override'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={overrideDraft.override_date}
                onChange={e => setOverrideDraft(d => ({ ...d, override_date: e.target.value }))}
                disabled={overrideEditId !== null}
              />
              {overrideDraft.override_date && (
                <p className="text-[11px] text-muted-foreground mt-1">{fmtDateLong(overrideDraft.override_date)}</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Open this day</p>
                <p className="text-[11px] text-muted-foreground">Toggle off for a closure (e.g., holiday).</p>
              </div>
              <Switch checked={overrideDraft.is_open} onCheckedChange={v => setOverrideDraft(d => ({ ...d, is_open: v }))} />
            </div>

            {overrideDraft.is_open && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Open</Label>
                    <TimePicker value={overrideDraft.open_time}
                      onChange={v => setOverrideDraft(d => ({ ...d, open_time: v }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Close</Label>
                    <TimePicker value={overrideDraft.close_time}
                      onChange={v => setOverrideDraft(d => ({ ...d, close_time: v }))} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Break</p>
                  <div className="grid grid-cols-2 gap-2">
                    <TimePicker value={overrideDraft.break_start}
                      onChange={v => setOverrideDraft(d => ({ ...d, break_start: v }))} />
                    <TimePicker value={overrideDraft.break_end}
                      onChange={v => setOverrideDraft(d => ({ ...d, break_end: v }))} />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">Reason / note (optional)</Label>
              <Input value={overrideDraft.reason}
                placeholder="e.g. Holiday, training day, half-day..."
                onChange={e => setOverrideDraft(d => ({ ...d, reason: e.target.value }))} />
            </div>

            <div className="flex gap-2 pt-2">
              {overrideEditId !== null && (
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDeleteDate(overrideDraft.override_date)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" onClick={() => setOverrideOpen(false)}>Cancel</Button>
                <Button onClick={saveOverride} className="gap-1"><Save className="w-4 h-4" /> Save</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDeleteDate !== null} onOpenChange={(o) => !o && setConfirmDeleteDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete override?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will restore the regular weekly hours for that date. Existing bookings on this date are not affected.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmDeleteDate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDeleteDate !== null && deleteOverride(confirmDeleteDate)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
