import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, ChevronDown, ChevronUp, Stethoscope, CheckCircle2, AlertCircle, User as UserIcon } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import type { GroupMember, ClinicSchedule, ScheduleOverride, ClinicService } from '@/lib/types';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { InlineSlotGrid } from '@/components/shared/DateTimePicker';
import { MedicalAssessmentForm, type MedicalAssessmentFields } from '@/components/shared/MedicalAssessmentForm';
import { ServicePicker } from '@/components/shared/ServicePicker';

const RELATIONSHIPS = ['Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Friend'];

const DOB_MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];
const CURRENT_YEAR = new Date().getFullYear();
const DOB_YEARS = Array.from({ length: 120 }, (_, i) => String(CURRENT_YEAR - i));

function getDobDays(year: string, month: string) {
  const maxDay = (year && month) ? new Date(Number(year), Number(month), 0).getDate() : 31;
  return Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));
}

function memberToMedical(m: Omit<GroupMember, 'id' | 'appointment_id'>): MedicalAssessmentFields {
  return {
    med_q1: m.med_q1 || '', med_q2: m.med_q2 || '', med_q2_details: m.med_q2_details || '',
    med_q3: m.med_q3 || '', med_q3_details: m.med_q3_details || '',
    med_q4: m.med_q4 || '', med_q4_details: m.med_q4_details || '',
    med_q5: m.med_q5 || '', med_q5_details: m.med_q5_details || '',
    med_q6: m.med_q6 || '',
    med_last_checkup: m.med_last_checkup || '',
    med_other: m.med_other || '',
    med_consent: !!m.med_consent,
  };
}

export interface MemberCardProps {
  index: number;
  total: number;
  member: Omit<GroupMember, 'id' | 'appointment_id'>;
  isExpanded: boolean;
  dobParts: { year: string; month: string; day: string };
  selectedDate: string | null;
  schedule: ClinicSchedule | null;
  overrides: ScheduleOverride[];
  bookedCounts: Record<string, number>;
  takenByOthers: Set<string>;
  services: ClinicService[];
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, patch: Partial<Omit<GroupMember, 'id' | 'appointment_id'>>) => void;
  onDobChange: (index: number, part: 'year' | 'month' | 'day', value: string) => void;
}

function MemberCardImpl({
  index, total, member, isExpanded, dobParts, selectedDate, schedule, overrides,
  bookedCounts, takenByOthers, services, onToggle, onRemove, onUpdate, onDobChange,
}: MemberCardProps) {
  const isSelf = member.relationship === 'Self';

  const handleSlot = React.useCallback((t: string) => {
    onUpdate(index, { appointment_time: t });
  }, [index, onUpdate]);

  const handleService = React.useCallback((name: string) => {
    onUpdate(index, { services: [name] });
  }, [index, onUpdate]);

  const handleMedical = React.useCallback((next: MedicalAssessmentFields) => {
    onUpdate(index, next);
  }, [index, onUpdate]);

  const memberService = (member.services && member.services[0]) || null;
  const activeService = services.find(s => s.name === memberService) || null;

  // Filter slots based on the service's available days for this date.
  const isDateAllowed = React.useMemo(() => {
    if (!selectedDate || !activeService?.available_days) return true;
    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dow = new Date(selectedDate + 'T12:00:00').getDay();
    return activeService.available_days.includes(DAY_KEYS[dow]);
  }, [selectedDate, activeService]);

  // Per-member completeness for the visual progress chip on the header.
  const isComplete = React.useMemo(() => {
    if (!member.member_name || !member.date_of_birth || !member.gender) return false;
    if (!memberService) return false;
    if (selectedDate && !member.appointment_time) return false;
    if (!isSelf) {
      if (!member.phone) return false;
      if (!member.med_consent) return false;
    }
    return true;
  }, [member, memberService, selectedDate, isSelf]);

  const initials = React.useMemo(() => {
    const name = (member.member_name || '').trim();
    if (!name) return String(index + 1);
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || String(index + 1);
  }, [member.member_name, index]);

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden bg-card transition-all duration-200',
      isExpanded ? 'border-secondary/40 shadow-sm ring-1 ring-secondary/10' : 'border-border/50 hover:border-secondary/25',
    )}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(index)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(index); } }}
        className="w-full flex items-center justify-between gap-2 p-3 hover:bg-mint/30 transition-colors cursor-pointer select-none">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar / number tile */}
          <span className={cn(
            'inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 text-xs font-bold ring-1 transition-all',
            isSelf
              ? 'bg-secondary text-secondary-foreground ring-secondary/30'
              : isComplete
                ? 'bg-mint text-secondary ring-secondary/30'
                : 'bg-muted/60 text-muted-foreground ring-border/40',
          )}>
            {isSelf ? <UserIcon className="w-4 h-4" /> : initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">
                {member.member_name || `Member ${index + 1}`}
              </span>
              {isSelf && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-secondary bg-mint px-1.5 py-0.5 rounded">
                  You
                </span>
              )}
              {isComplete ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                  <AlertCircle className="w-2.5 h-2.5" /> Needs info
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {memberService && (
                <span className="text-[10px] text-secondary font-medium truncate max-w-[160px]">
                  {memberService}
                </span>
              )}
              {memberService && member.appointment_time && (
                <span className="text-[10px] text-muted-foreground">&middot;</span>
              )}
              {member.appointment_time && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  {formatTime(member.appointment_time)}
                </span>
              )}
              {!memberService && !member.appointment_time && (
                <span className="text-[10px] text-muted-foreground italic">Tap to fill in details</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isSelf && total > 1 && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onRemove(index); }}><Trash2 className="w-3.5 h-3.5" /></Button>
          )}
          <span className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
            isExpanded ? 'bg-secondary/10 text-secondary' : 'text-muted-foreground',
          )}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-4 border-t border-border/30">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={member.member_name}
                onChange={e => onUpdate(index, { member_name: e.target.value.slice(0, 30) })}
                disabled={isSelf}
                className="h-9"
                maxLength={30}
              />
            </div>
            <div>
              <Label className="text-xs">Date of Birth *</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                <Select value={dobParts.month} onValueChange={v => onDobChange(index, 'month', v)} disabled={isSelf}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {DOB_MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={dobParts.day} onValueChange={v => onDobChange(index, 'day', v)} disabled={isSelf}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {getDobDays(dobParts.year, dobParts.month).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={dobParts.year} onValueChange={v => onDobChange(index, 'year', v)} disabled={isSelf}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {DOB_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Gender *</Label>
              <Select value={member.gender} onValueChange={v => onUpdate(index, { gender: v })} disabled={isSelf}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Relationship *</Label>
              <Select value={member.relationship} onValueChange={v => onUpdate(index, { relationship: v })} disabled={isSelf}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.filter(r => r !== 'Self' || isSelf).map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Phone {isSelf ? '(from your profile)' : '*'}</Label>
              <PhoneInput value={member.phone || ''} onChange={v => onUpdate(index, { phone: v })} disabled={isSelf} className="mt-1" showIcon={false} />
            </div>
          </div>

          {/* Service picker per member */}
          <div>
            <Label className="text-xs flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Service *</Label>
            <div className="mt-1.5">
              <ServicePicker
                services={services}
                value={memberService}
                onChange={handleService}
                compact
              />
            </div>
          </div>

          {/* Time Slot for this member */}
          {selectedDate && (
            <div>
              <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Time Slot *</Label>
              <div className="mt-1">
                {!memberService && (
                  <p className="text-[11px] text-muted-foreground italic mb-1.5">Pick a service above to enable time slots.</p>
                )}
                {memberService && !isDateAllowed && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-1.5">
                    {memberService} is not offered on this weekday. Pick another day, or change the service.
                  </p>
                )}
                {memberService && isDateAllowed && (
                  <InlineSlotGrid
                    weekly={schedule}
                    overrides={overrides}
                    date={selectedDate}
                    selectedTime={member.appointment_time}
                    takenByOthers={takenByOthers}
                    bookedCounts={bookedCounts}
                    onChange={handleSlot}
                  />
                )}
              </div>
            </div>
          )}

          {/* Medical Assessment — required for non-self members */}
          {!isSelf && (
            <div className="border-t border-border/30 pt-3">
              <MedicalAssessmentForm
                value={memberToMedical(member)}
                onChange={handleMedical}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const MemberCard = React.memo(MemberCardImpl, (prev, next) =>
  prev.member === next.member &&
  prev.isExpanded === next.isExpanded &&
  prev.dobParts === next.dobParts &&
  prev.selectedDate === next.selectedDate &&
  prev.bookedCounts === next.bookedCounts &&
  prev.takenByOthers === next.takenByOthers &&
  prev.services === next.services &&
  prev.schedule === next.schedule &&
  prev.overrides === next.overrides &&
  prev.total === next.total &&
  prev.index === next.index,
);
