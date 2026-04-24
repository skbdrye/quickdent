import { useMemo, useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 12-hour time picker with explicit AM/PM toggle.
 * `value` is a HH:mm string (24h, like Input[type="time"]).
 * Designed to render compactly in narrow columns and never split awkwardly.
 */
export function TimePicker({
  value,
  onChange,
  className,
  disabled,
  step = 5,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
  step?: 1 | 5 | 10 | 15 | 30;
  ariaLabel?: string;
}) {
  const parsed = parse24(value);
  const [open, setOpen] = useState(false);
  const [hour12, setHour12] = useState<number>(parsed.hour12);
  const [minute, setMinute] = useState<number>(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);

  useEffect(() => {
    const p = parse24(value);
    setHour12(p.hour12);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const minutes = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < 60; i += step) list.push(i);
    return list;
  }, [step]);

  function commit(newHour12 = hour12, newMinute = minute, newPeriod: 'AM' | 'PM' = period) {
    const h24 = to24(newHour12, newPeriod);
    const out = `${String(h24).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    onChange(out);
  }

  const display = formatDisplay(value);

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel || 'Pick time'}
          className={cn(
            'h-9 px-2.5 w-full justify-between font-normal text-xs gap-1 whitespace-nowrap',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span className="tabular-nums">{display}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-auto z-[100]" align="start" sideOffset={6}>
        <div className="flex items-center gap-2">
          {/* Hours */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1 text-center">Hr</span>
            <div
              className="time-col h-44 w-14 overflow-y-scroll smooth-scroll rounded-md border border-border/60 bg-muted/20"
              onWheelCapture={(e) => { e.stopPropagation(); }}
              onTouchMoveCapture={(e) => { e.stopPropagation(); }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                <button
                  type="button"
                  key={h}
                  ref={h === hour12 ? (el) => el?.scrollIntoView({ block: 'center' }) : undefined}
                  onClick={() => { setHour12(h); commit(h, minute, period); }}
                  className={cn(
                    'w-full text-center py-2 text-sm tabular-nums transition-colors',
                    h === hour12 ? 'bg-secondary text-secondary-foreground font-semibold' : 'hover:bg-mint/40 text-foreground',
                  )}
                >{h}</button>
              ))}
            </div>
          </div>
          <span className="text-base font-semibold pt-5">:</span>
          {/* Minutes */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1 text-center">Min</span>
            <div
              className="time-col h-44 w-14 overflow-y-scroll smooth-scroll rounded-md border border-border/60 bg-muted/20"
              onWheelCapture={(e) => { e.stopPropagation(); }}
              onTouchMoveCapture={(e) => { e.stopPropagation(); }}
            >
              {minutes.map(m => (
                <button
                  type="button"
                  key={m}
                  ref={m === minute ? (el) => el?.scrollIntoView({ block: 'center' }) : undefined}
                  onClick={() => { setMinute(m); commit(hour12, m, period); }}
                  className={cn(
                    'w-full text-center py-2 text-sm tabular-nums transition-colors',
                    m === minute ? 'bg-secondary text-secondary-foreground font-semibold' : 'hover:bg-mint/40 text-foreground',
                  )}
                >{String(m).padStart(2, '0')}</button>
              ))}
            </div>
          </div>
          {/* AM / PM */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1 text-center">&nbsp;</span>
            <div className="flex flex-col gap-1.5">
              {(['AM', 'PM'] as const).map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => { setPeriod(p); commit(hour12, minute, p); }}
                  className={cn(
                    'px-3 py-2 rounded-md text-xs font-semibold border transition-colors',
                    period === p
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-background hover:bg-mint/40 border-border',
                  )}
                >{p}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Selected: <strong className="text-foreground tabular-nums">{display}</strong></span>
          <Button size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parse24(v: string | null | undefined): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  if (!v || !/^\d{1,2}:\d{2}/.test(v)) return { hour12: 9, minute: 0, period: 'AM' };
  const [hStr, mStr] = v.split(':');
  let h = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h = h - 12;
  return { hour12: h, minute: m, period };
}

function to24(hour12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function formatDisplay(v: string | null | undefined): string {
  if (!v) return '--:-- --';
  const p = parse24(v);
  return `${p.hour12}:${String(p.minute).padStart(2, '0')} ${p.period}`;
}
