import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppointmentsStore, useAuthStore, useProfileStore, useClinicStore } from '@/lib/store';
import {
  groupMembersAPI, notificationsAPI, companionsAPI, scheduleOverridesAPI, appointmentsAPI,
  SlotTakenError, BookingCooldownError, TooManyActiveBookingsError, getEffectiveDay, getDayCapacity,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Plus, AlertCircle, BookmarkCheck, UsersRound, CheckCircle2, CalendarDays, ArrowRight,
  User as UserIcon, Sparkles, Clock,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import type { GroupMember, DashboardPage, ScheduleOverride, SavedCompanion } from '@/lib/types';
import { SuccessModal } from '@/components/shared/SuccessModal';
import { isValidPHPhone } from '@/components/shared/PhoneInput';
import { CompanionPicker } from '@/components/shared/CompanionPicker';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MemberCard } from './MemberCard';
import { PageHeader } from '@/components/shared/PageHeader';

const emptyMember = (): Omit<GroupMember, 'id' | 'appointment_id'> => ({
  member_name: '', date_of_birth: '', gender: '', phone: '', relationship: '', appointment_time: '',
  is_primary: false, linked_user_id: null, services: null,
  med_q1: '', med_q2: '', med_q2_details: '', med_q3: '', med_q3_details: '',
  med_q4: '', med_q4_details: '', med_q5: '', med_q5_details: '', med_q6: '',
  med_last_checkup: '', med_other: '', med_consent: false,
});

export function GroupBooking({ onNavigate }: { onNavigate?: (page: DashboardPage) => void }) {
  const { addAppointment } = useAppointmentsStore();
  const { user } = useAuthStore();
  const { profile, assessment, fetchProfile, fetchAssessment, isProfileComplete, isAssessmentSubmitted } = useProfileStore();
  const { schedule, fetchSchedule, services, fetchServices } = useClinicStore();
  const { toast } = useToast();

  const [members, setMembers] = useState([emptyMember()]);
  const [includeSelf, setIncludeSelf] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>({});
  const [expandedMember, setExpandedMember] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 24-hour cancel/reschedule policy: warn the booker if ANY member is
  // scheduled inside the next 24 hours so they understand it locks in.
  const [warnWithin24h, setWarnWithin24h] = useState(false);
  const [successModal, setSuccessModal] = useState<{ open: boolean; count: number; date: string }>({ open: false, count: 0, date: '' });
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [companionPickerFor, setCompanionPickerFor] = useState<number | null>(null);
  const membersCardRef = useRef<HTMLDivElement>(null);

  // Per-member DOB parts so partial selection persists
  const [memberDobParts, setMemberDobParts] = useState<{ year: string; month: string; day: string }[]>([{ year: '', month: '', day: '' }]);

  useEffect(() => {
    setMemberDobParts(prev => {
      const next = members.map((m, i) => {
        if (m.date_of_birth && (!prev[i] || prev[i].year === '')) {
          const [y, mo, d] = m.date_of_birth.split('-');
          return { year: y || '', month: mo || '', day: d || '' };
        }
        return prev[i] || { year: '', month: '', day: '' };
      });
      return next;
    });
  }, [members.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMemberDobChange = useCallback((memberIndex: number, part: 'year' | 'month' | 'day', value: string) => {
    setMemberDobParts(prev => {
      const next = [...prev];
      const current = next[memberIndex] || { year: '', month: '', day: '' };
      const newParts = { ...current, [part]: value };
      if (newParts.year && newParts.month) {
        const maxDay = new Date(Number(newParts.year), Number(newParts.month), 0).getDate();
        if (Number(newParts.day) > maxDay) newParts.day = String(maxDay).padStart(2, '0');
      }
      next[memberIndex] = newParts;
      if (newParts.year && newParts.month && newParts.day) {
        setMembers(prevMembers => prevMembers.map((m, i) =>
          i === memberIndex ? { ...m, date_of_birth: `${newParts.year}-${newParts.month}-${newParts.day}` } : m
        ));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (user?.id) { fetchProfile(user.id); fetchAssessment(user.id); }
    fetchSchedule();
    fetchServices();
    scheduleOverridesAPI.list().then(setOverrides).catch(() => {});
  }, [user?.id, fetchProfile, fetchAssessment, fetchSchedule, fetchServices]);

  const loadBookedCounts = useCallback(async (date: string) => {
    const counts = await appointmentsAPI.fetchSlotCounts(date);
    setBookedCounts(counts.byTime);
  }, []);

  useEffect(() => { if (selectedDate) loadBookedCounts(selectedDate); }, [selectedDate, loadBookedCounts]);

  // When includeSelf changes, add/remove self as first member
  useEffect(() => {
    if (includeSelf && profile && user) {
      const selfMember: Omit<GroupMember, 'id' | 'appointment_id'> = {
        member_name: `${profile.first_name} ${profile.last_name}`.trim(),
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        phone: profile.phone,
        relationship: 'Self',
        appointment_time: '',
        is_primary: true,
        linked_user_id: user.id,
        services: null,
        med_q1: assessment?.q1 || '', med_q2: assessment?.q2 || '', med_q2_details: assessment?.q2_details || '',
        med_q3: assessment?.q3 || '', med_q3_details: assessment?.q3_details || '',
        med_q4: assessment?.q4 || '', med_q4_details: assessment?.q4_details || '',
        med_q5: assessment?.q5 || '', med_q5_details: assessment?.q5_details || '',
        med_q6: assessment?.q6 || '', med_last_checkup: assessment?.last_checkup || '',
        med_other: assessment?.other_medical || '', med_consent: assessment?.consent || false,
      };
      setMembers(prev => {
        const filtered = prev.filter(m => m.relationship !== 'Self');
        const result = [selfMember, ...filtered];
        const selfDob = selfMember.date_of_birth ? selfMember.date_of_birth.split('-') : ['', '', ''];
        setMemberDobParts(prevParts => {
          const filteredParts = prevParts.slice(prev.findIndex(m => m.relationship !== 'Self') === -1 ? prevParts.length : 0);
          return [{ year: selfDob[0] || '', month: selfDob[1] || '', day: selfDob[2] || '' }, ...filteredParts.slice(0, filtered.length)];
        });
        return result;
      });
    } else {
      setMembers(prev => prev.filter(m => m.relationship !== 'Self'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeSelf]);

  const updateMember = useCallback((index: number, data: Partial<Omit<GroupMember, 'id' | 'appointment_id'>>) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, ...data } : m));
  }, []);

  const toggleExpanded = useCallback((index: number) => {
    setExpandedMember(prev => prev === index ? -1 : index);
  }, []);

  const removeMember = useCallback((index: number) => {
    setMembers(prev => {
      if (prev[index]?.relationship === 'Self') {
        setIncludeSelf(false);
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
    setMemberDobParts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addMember = () => {
    if (members.length >= 5) {
      toast({ title: 'Limit reached', description: 'Maximum 5 members per group booking', variant: 'destructive' });
      return;
    }
    setMembers(prev => [...prev, emptyMember()]);
    setMemberDobParts(prev => [...prev, { year: '', month: '', day: '' }]);
    setExpandedMember(members.length);
  };

  const profileReady = isProfileComplete() && isAssessmentSubmitted();

  // Per-member completion check used for the new "ready X / Y" indicator
  // and for the upgraded sticky CTA bar. Mirrors handleBook validation.
  const readyCount = useMemo(() => {
    return members.reduce((acc, m) => {
      if (!m.member_name || !m.date_of_birth || !m.gender || !m.appointment_time) return acc;
      if (!m.services || m.services.length === 0) return acc;
      if (m.relationship !== 'Self') {
        const ph = (m.phone || '').trim();
        if (!ph || !isValidPHPhone(ph)) return acc;
        if (!m.med_consent) return acc;
      }
      return acc + 1;
    }, 0);
  }, [members]);

  const allReady = members.length > 0 && readyCount === members.length;

  const flowStep = !selectedDate ? 1 : !allReady ? 2 : 3;

  // Recompute "taken by others" once and pass a stable Set to each MemberCard.
  const selectedTimesSet = useMemo(
    () => new Set(members.map(m => m.appointment_time).filter(Boolean)),
    [members],
  );

  // Capacity for the picked date — used to validate that members selecting the
  // same time slot don't exceed perSlot.
  const dayCapacity = useMemo(() => {
    if (!selectedDate) return null;
    const eff = getEffectiveDay(selectedDate, schedule, overrides);
    return { eff, cap: getDayCapacity(eff.day, eff.override) };
  }, [selectedDate, schedule, overrides]);

  // True if ANY member's chosen slot starts inside the next 24h.
  const isWithin24h = useMemo(() => {
    if (!selectedDate) return false;
    const cutoff = Date.now() + 24 * 60 * 60 * 1000;
    return members.some(m => {
      if (!m.appointment_time) return false;
      const t = new Date(`${selectedDate}T${m.appointment_time}`);
      return t.getTime() < cutoff;
    });
  }, [selectedDate, members]);

  /** Open the 24h confirm dialog if needed; otherwise book straight away. */
  const requestBook = () => {
    if (!allReady || !selectedDate || isSubmitting) return;
    if (isWithin24h) {
      setWarnWithin24h(true);
      return;
    }
    void handleBook();
  };

  const handleBook = async () => {
    if (!selectedDate || !user) {
      toast({ title: 'Incomplete', description: 'Please select a date', variant: 'destructive' });
      return;
    }
    if (members.length === 0) {
      toast({ title: 'No members', description: 'Add at least one member', variant: 'destructive' });
      return;
    }
    const nonSelfMembers = members.filter(m => m.relationship !== 'Self');
    if (nonSelfMembers.length === 0 && members.length === 1 && members[0].relationship === 'Self') {
      toast({
        title: 'No companions added',
        description: 'You only included yourself with no other members. Please use the "Book Appointment" feature instead for individual bookings.',
        variant: 'destructive',
      });
      return;
    }
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.member_name || !m.date_of_birth || !m.gender || !m.appointment_time) {
        toast({ title: 'Incomplete', description: `Please fill in all required details for member ${i + 1} (name, date of birth, gender, and time slot)`, variant: 'destructive' });
        setExpandedMember(i);
        return;
      }
      if (!m.services || m.services.length === 0) {
        toast({ title: 'Service required', description: `Please pick a service for member ${i + 1}.`, variant: 'destructive' });
        setExpandedMember(i);
        return;
      }
      if (m.relationship !== 'Self') {
        const ph = (m.phone || '').trim();
        if (!ph) {
          toast({ title: 'Phone required', description: `Please provide a phone number for member ${i + 1}.`, variant: 'destructive' });
          setExpandedMember(i);
          return;
        }
        if (!isValidPHPhone(ph)) {
          toast({ title: 'Invalid phone', description: `Member ${i + 1}: PH mobile must be 11 digits and start with 09.`, variant: 'destructive' });
          setExpandedMember(i);
          return;
        }
      }
      if (!m.med_consent) {
        toast({ title: 'Consent Missing', description: `Member ${i + 1} must check the medical consent box`, variant: 'destructive' });
        setExpandedMember(i);
        return;
      }
    }

    // Validate the group internally won't blow per-slot capacity (in case 2+
    // members chose the same time when capacity is 1).
    if (dayCapacity) {
      const localCounts: Record<string, number> = {};
      for (const m of members) {
        localCounts[m.appointment_time] = (localCounts[m.appointment_time] || 0) + 1;
      }
      for (const [time, used] of Object.entries(localCounts)) {
        const externalUsed = bookedCounts[time] || 0;
        if (used + externalUsed > dayCapacity.cap.perSlot) {
          toast({
            title: 'Slot capacity exceeded',
            description: `Only ${dayCapacity.cap.perSlot} booking(s) allowed at ${formatTime(time)}. Please pick different times.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // Refresh counts and re-check
    const fresh = await appointmentsAPI.fetchSlotCounts(selectedDate);
    setBookedCounts(fresh.byTime);
    if (dayCapacity) {
      const localCounts: Record<string, number> = {};
      for (const m of members) {
        localCounts[m.appointment_time] = (localCounts[m.appointment_time] || 0) + 1;
      }
      for (const [time, used] of Object.entries(localCounts)) {
        const externalUsed = fresh.byTime[time] || 0;
        if (used + externalUsed > dayCapacity.cap.perSlot) {
          toast({
            title: 'Slot just filled',
            description: `${formatTime(time)} just reached its capacity. Please pick another time.`,
            variant: 'destructive',
          });
          return;
        }
      }
      if (dayCapacity.cap.daily !== null && fresh.total + members.length > dayCapacity.cap.daily) {
        toast({ title: 'Day fully booked', description: 'This day cannot accept that many more bookings. Please pick another date.', variant: 'destructive' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const apt = await addAppointment({
        user_id: user.id,
        patient_name: user.username,
        appointment_date: selectedDate,
        appointment_time: members[0].appointment_time,
        duration_min: 30 * members.length,
        notes: `Companions: ${members.map(m => m.member_name).join(', ')}`,
        contact: profile?.phone || user.phone,
        status: 'Pending',
        is_group_booking: true,
        service: members[0].services?.[0] || null,
      });

      await groupMembersAPI.create(members.map(m => ({
        ...m,
        appointment_id: apt.id,
      })));

      members.filter(m => m.relationship !== 'Self' && m.member_name).forEach(m => {
        companionsAPI.upsert({
          owner_id: user.id,
          member_name: m.member_name,
          date_of_birth: m.date_of_birth || null,
          gender: m.gender || null,
          phone: m.phone || null,
          relationship: m.relationship || null,
          med_q1: m.med_q1, med_q2: m.med_q2, med_q2_details: m.med_q2_details,
          med_q3: m.med_q3, med_q3_details: m.med_q3_details,
          med_q4: m.med_q4, med_q4_details: m.med_q4_details,
          med_q5: m.med_q5, med_q5_details: m.med_q5_details,
          med_q6: m.med_q6,
          med_last_checkup: m.med_last_checkup, med_other: m.med_other,
          med_consent: m.med_consent,
        }).catch(() => {});
      });

      toast({ title: 'Booked!', description: `${members.length} member(s) booked. Pending approval.` });

      await notificationsAPI.notifyAdmins(
        'New Companion Booking',
        `${user.username} booked for ${members.length} member(s): ${members.map(m => m.member_name).join(', ')} on ${selectedDate}.`,
        'new_booking',
        apt?.id
      );
      const bookedCount = members.length;
      const bookedDate = selectedDate;
      setMembers([emptyMember()]);
      setMemberDobParts([{ year: '', month: '', day: '' }]);
      setIncludeSelf(false);
      setSelectedDate(null);
      setSuccessModal({ open: true, count: bookedCount, date: bookedDate });
    } catch (err) {
      if (err instanceof SlotTakenError) {
        toast({ title: 'Slot just taken', description: err.message, variant: 'destructive' });
        if (selectedDate) loadBookedCounts(selectedDate);
      } else if (err instanceof BookingCooldownError) {
        toast({ title: 'Slow down a bit', description: err.message, variant: 'destructive' });
      } else if (err instanceof TooManyActiveBookingsError) {
        toast({ title: 'Too many active bookings', description: err.message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to book.', variant: 'destructive' });
      }
    }
    setIsSubmitting(false);
  };

  if (!profileReady) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-amber-200 dark:border-amber-800/60 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-amber-50 via-amber-50/50 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 px-6 py-7 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 ring-1 ring-amber-300/60 dark:ring-amber-800 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Just one more step</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Finish your own profile first — then you can book for family or friends.
            </p>
          </div>
          <div className="border-t border-border/40 p-5 space-y-2">
            <div className={cn(
              'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
              isProfileComplete() ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20',
            )}>
              <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0', isProfileComplete() ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white')}>
                {isProfileComplete() ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              </span>
              <span className="text-sm font-medium text-foreground">Patient details</span>
              <span className={cn('ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', isProfileComplete() ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400')}>{isProfileComplete() ? 'Done' : 'Needed'}</span>
            </div>
            <div className={cn(
              'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
              isAssessmentSubmitted() ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20',
            )}>
              <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0', isAssessmentSubmitted() ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white')}>
                {isAssessmentSubmitted() ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              </span>
              <span className="text-sm font-medium text-foreground">Medical assessment</span>
              <span className={cn('ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', isAssessmentSubmitted() ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400')}>{isAssessmentSubmitted() ? 'Done' : 'Needed'}</span>
            </div>
            {onNavigate && (
              <Button onClick={() => onNavigate('profile')} className="w-full mt-3 gap-1.5" size="lg">
                Complete my profile <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        icon={UsersRound}
        title="Book for Others"
        description="Book for family, friends, or include yourself. Pick a service for each member."
      />

      {/* Flow strip — guides patients through Date -> Members -> Review */}
      <ol className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground overflow-x-auto pb-1">
        <FlowChip step={1} active={flowStep === 1} done={!!selectedDate} label="Pick date" icon={CalendarDays} />
        <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
        <FlowChip step={2} active={flowStep === 2} done={allReady && members.length > 0} label={`Members (${readyCount}/${members.length})`} icon={Users} />
        <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
        <FlowChip step={3} active={flowStep === 3} done={false} label="Review & book" icon={Sparkles} />
      </ol>

      {/* Date selection FIRST so users see availability before adding people */}
      <DateTimePicker
        weekly={schedule}
        overrides={overrides}
        selectedDate={selectedDate}
        selectedTime={null}
        onDateChange={(d) => {
          setSelectedDate(d);
          setMembers(prev => prev.map(m => ({ ...m, appointment_time: '' })));
          setExpandedMember(0);
          setTimeout(() => membersCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }}
        onTimeChange={() => {}}
        hideTimeSlots
      />

      {/* Include Self Toggle — bigger touch target, avatar, value summary when on */}
      <Card className={cn(
        'border-border/60 transition-all duration-200 overflow-hidden',
        includeSelf && 'border-secondary/50 ring-1 ring-secondary/20 shadow-sm',
      )}>
        <label className="flex items-center gap-4 p-4 cursor-pointer">
          <Checkbox checked={includeSelf} onCheckedChange={(c) => setIncludeSelf(c === true)} className="h-5 w-5" />
          <span className={cn(
            'inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ring-1 transition-colors',
            includeSelf ? 'bg-secondary text-secondary-foreground ring-secondary/30' : 'bg-mint text-secondary ring-secondary/15',
          )}>
            <UserIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Include myself in this booking</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {includeSelf
                ? 'Your profile and medical info are auto-filled — added as the first member below.'
                : 'Toggle on if you also want a slot for yourself.'}
            </p>
          </div>
          {includeSelf && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Added
            </span>
          )}
        </label>
      </Card>

      {/* Members */}
      <Card className="border-border/60 overflow-hidden" ref={membersCardRef}>
        <CardHeader className="pb-3 bg-gradient-to-br from-mint/40 to-transparent border-b border-border/40">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-card text-secondary ring-1 ring-secondary/15">
                <Users className="w-4 h-4" />
              </span>
              <span>
                Members
                <span className="text-xs font-normal text-muted-foreground ml-2">({members.length}/5)</span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {user?.id && (
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setCompanionPickerFor(expandedMember >= 0 ? expandedMember : 0)}>
                  <BookmarkCheck className="w-3.5 h-3.5" /> Saved
                </Button>
              )}
              <Button variant="default" size="sm" onClick={addMember} disabled={members.length >= 5} className="gap-1.5 h-8">
                <Plus className="w-3.5 h-3.5" /> Add member
              </Button>
            </div>
          </div>
          {members.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-secondary via-secondary to-emerald-500 transition-all duration-300"
                  style={{ width: `${(readyCount / members.length) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground shrink-0">
                {readyCount}/{members.length} ready
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {members.map((member, i) => (
            <MemberCard
              key={i}
              index={i}
              total={members.length}
              member={member}
              isExpanded={expandedMember === i}
              dobParts={memberDobParts[i] || { year: '', month: '', day: '' }}
              selectedDate={selectedDate}
              schedule={schedule}
              overrides={overrides}
              bookedCounts={bookedCounts}
              takenByOthers={selectedTimesSet}
              services={services}
              onToggle={toggleExpanded}
              onRemove={removeMember}
              onUpdate={updateMember}
              onDobChange={handleMemberDobChange}
            />
          ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-2 z-10">
        <Card className={cn(
          'shadow-lg backdrop-blur bg-background/95 transition-colors',
          allReady ? 'border-emerald-300/50 ring-1 ring-emerald-300/30' : 'border-secondary/30 ring-1 ring-secondary/10',
        )}>
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
            <span className={cn(
              'inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ring-1 transition-colors',
              allReady ? 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800' : 'bg-mint text-secondary ring-secondary/15',
            )}>
              {allReady ? <CheckCircle2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </span>
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-foreground truncate">
                {readyCount}/{members.length} member{members.length !== 1 ? 's' : ''} ready
              </p>
              {selectedDate ? (
                <p className="text-xs text-muted-foreground truncate">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">Pick a date first</p>
              )}
            </div>
            <Button onClick={requestBook} size="lg" disabled={isSubmitting || !allReady || !selectedDate} className="shrink-0 gap-1.5">
              {isSubmitting ? 'Booking...' : <>Book for {members.length} <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <SuccessModal
        open={successModal.open}
        title="Companion Booking Confirmed!"
        description={`${successModal.count} member(s) booked for ${successModal.date ? new Date(successModal.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}. Pending admin approval.`}
        onClose={() => {
          setSuccessModal({ open: false, count: 0, date: '' });
          if (onNavigate) onNavigate('dashboard');
        }}
      />

      {/* 24-hour cancellation policy gate (group booking) */}
      <AlertDialog open={warnWithin24h} onOpenChange={setWarnWithin24h}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 ring-1 ring-amber-200">
                <Clock className="w-5 h-5" />
              </span>
              <AlertDialogTitle className="text-base">Less than 24 hours away</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              One or more members in this group are scheduled within the next 24 hours. Once booked,
              those appointments{' '}
              <span className="font-semibold text-foreground">cannot be cancelled or rescheduled</span>.
              <br /><br />
              Do you wish to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Pick another time</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setWarnWithin24h(false); void handleBook(); }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Yes, book all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {user?.id && companionPickerFor !== null && (
        <CompanionPicker
          open
          ownerId={user.id}
          onClose={() => setCompanionPickerFor(null)}
          onPick={(c: SavedCompanion) => {
            const idx = companionPickerFor;
            if (idx === null) return;
            setMembers(prev => prev.map((m, i) => i === idx ? {
              ...m,
              member_name: c.member_name,
              date_of_birth: c.date_of_birth || '',
              gender: c.gender || '',
              phone: c.phone || '',
              relationship: c.relationship || m.relationship || '',
              med_q1: c.med_q1 || '', med_q2: c.med_q2 || '', med_q2_details: c.med_q2_details || '',
              med_q3: c.med_q3 || '', med_q3_details: c.med_q3_details || '',
              med_q4: c.med_q4 || '', med_q4_details: c.med_q4_details || '',
              med_q5: c.med_q5 || '', med_q5_details: c.med_q5_details || '',
              med_q6: c.med_q6 || '', med_last_checkup: c.med_last_checkup || '',
              med_other: c.med_other || '', med_consent: !!c.med_consent,
            } : m));
            if (c.date_of_birth) {
              const [y, mo, d] = c.date_of_birth.split('-');
              setMemberDobParts(prev => prev.map((p, i) => i === idx ? { year: y || '', month: mo || '', day: d || '' } : p));
            }
            setCompanionPickerFor(null);
            toast({ title: 'Companion loaded', description: `${c.member_name}'s info auto-filled.` });
          }}
        />
      )}
    </div>
  );
}

function FlowChip({
  step, active, done, label, icon: Icon,
}: {
  step: number; active: boolean; done: boolean; label: string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 whitespace-nowrap shrink-0',
      done && 'bg-mint text-secondary ring-1 ring-secondary/20',
      active && !done && 'bg-secondary text-secondary-foreground shadow-sm scale-[1.02]',
      !active && !done && 'bg-muted/50 text-muted-foreground',
    )}>
      {done ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <span className={cn(
          'w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold',
          active ? 'bg-secondary-foreground/20 text-secondary-foreground' : 'bg-muted-foreground/15 text-muted-foreground',
        )}>{step}</span>
      )}
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
