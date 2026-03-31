import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppointmentsStore, useAuthStore, useProfileStore, useClinicStore } from '@/lib/store';
import { groupMembersAPI, notificationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Clock, Users, Plus, Trash2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroupMember, ClinicScheduleDay, DashboardPage } from '@/lib/types';
import { SuccessModal } from '@/components/shared/SuccessModal';

const RELATIONSHIPS = ['Self', 'Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Friend'];

function generateTimeSlots(scheduleDay: ClinicScheduleDay | null) {
  const slots: { label: string; value: string; available: boolean }[] = [];
  if (!scheduleDay || !scheduleDay.is_open) return slots;
  const [openH, openM] = scheduleDay.open_time.split(':').map(Number);
  const [closeH, closeM] = scheduleDay.close_time.split(':').map(Number);
  const [bsH, bsM] = (scheduleDay.break_start || '12:00').split(':').map(Number);
  const [beH, beM] = (scheduleDay.break_end || '13:00').split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  const bsMin = bsH * 60 + bsM;
  const beMin = beH * 60 + beM;
  for (let t = openMin; t < closeMin; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const h24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const eT = t + 30;
    const eH = Math.floor(eT / 60);
    const eM = eT % 60;
    const fmt = (hr: number, mn: number) => { const d = new Date(); d.setHours(hr, mn); return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
    slots.push({ label: `${fmt(h, m)} - ${fmt(eH, eM)}`, value: h24, available: !(t >= bsMin && t < beMin) });
  }
  return slots;
}

const emptyMember = (): Omit<GroupMember, 'id' | 'appointment_id'> => ({
  member_name: '', date_of_birth: '', gender: '', phone: '', relationship: '', appointment_time: '',
  is_primary: false, linked_user_id: null,
  med_q1: '', med_q2: '', med_q2_details: '', med_q3: '', med_q3_details: '',
  med_q4: '', med_q4_details: '', med_q5: '', med_q5_details: '', med_q6: '',
  med_last_checkup: '', med_other: '', med_consent: false,
});

export function GroupBooking({ onNavigate }: { onNavigate?: (page: DashboardPage) => void }) {
  const { addAppointment } = useAppointmentsStore();
  const { user } = useAuthStore();
  const { profile, assessment, fetchProfile, fetchAssessment, isProfileComplete, isAssessmentSubmitted } = useProfileStore();
  const { schedule, fetchSchedule } = useClinicStore();
  const { toast } = useToast();

  const [members, setMembers] = useState([emptyMember()]);
  const [includeSelf, setIncludeSelf] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [expandedMember, setExpandedMember] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<{ open: boolean; count: number; date: string }>({ open: false, count: 0, date: '' });
  const membersCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) { fetchProfile(user.id); fetchAssessment(user.id); }
    fetchSchedule();
  }, [user?.id, fetchProfile, fetchAssessment, fetchSchedule]);

  const loadBookedSlots = useCallback(async (date: string) => {
    const slots = await useAppointmentsStore.getState().fetchBookedSlots(date);
    setBookedSlots(new Set(slots));
  }, []);

  useEffect(() => { if (selectedDate) loadBookedSlots(selectedDate); }, [selectedDate, loadBookedSlots]);

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
        med_q1: assessment?.q1 || '', med_q2: assessment?.q2 || '', med_q2_details: assessment?.q2_details || '',
        med_q3: assessment?.q3 || '', med_q3_details: assessment?.q3_details || '',
        med_q4: assessment?.q4 || '', med_q4_details: assessment?.q4_details || '',
        med_q5: assessment?.q5 || '', med_q5_details: assessment?.q5_details || '',
        med_q6: assessment?.q6 || '', med_last_checkup: assessment?.last_checkup || '',
        med_other: assessment?.other_medical || '', med_consent: assessment?.consent || false,
      };
      setMembers(prev => {
        const filtered = prev.filter(m => m.relationship !== 'Self');
        return [selfMember, ...filtered];
      });
    } else {
      setMembers(prev => prev.filter(m => m.relationship !== 'Self'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeSelf]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const getScheduleForDay = (dow: number): ClinicScheduleDay | null => schedule?.[String(dow)] || null;

  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dow = new Date(selectedDate + 'T12:00:00').getDay();
    return generateTimeSlots(getScheduleForDay(dow));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, schedule]);

  const updateMember = (index: number, data: Partial<Omit<GroupMember, 'id' | 'appointment_id'>>) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, ...data } : m));
  };

  const addMember = () => {
    if (members.length >= 5) {
      toast({ title: 'Limit reached', description: 'Maximum 5 members per group booking', variant: 'destructive' });
      return;
    }
    setMembers(prev => [...prev, emptyMember()]);
    setExpandedMember(members.length);
  };

  const removeMember = (index: number) => {
    if (members[index].relationship === 'Self') {
      setIncludeSelf(false);
      return;
    }
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const profileReady = isProfileComplete() && isAssessmentSubmitted();

  const handleBook = async () => {
    if (!selectedDate || !user) {
      toast({ title: 'Incomplete', description: 'Please select a date', variant: 'destructive' });
      return;
    }
    if (members.length === 0) {
      toast({ title: 'No members', description: 'Add at least one member', variant: 'destructive' });
      return;
    }
    // If only self is in the group (no other members), suggest using Book Appointment instead
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
      if (!m.med_consent) {
        toast({ title: 'Consent Missing', description: `Member ${i + 1} must check the medical consent box`, variant: 'destructive' });
        setExpandedMember(i);
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
      });

      await groupMembersAPI.create(members.map(m => ({
        ...m,
        appointment_id: apt.id,
      })));

      toast({ title: 'Booked!', description: `${members.length} member(s) booked. Pending approval.` });

      // Notify admins about new booking
      await notificationsAPI.notifyAdmins(
        'New Companion Booking',
        `${user.username} booked for ${members.length} member(s): ${members.map(m => m.member_name).join(', ')} on ${selectedDate}.`,
        'new_booking',
        apt?.id
      );
      const bookedCount = members.length;
      const bookedDate = selectedDate;
      setMembers([emptyMember()]);
      setIncludeSelf(false);
      setSelectedDate(null);
      setSuccessModal({ open: true, count: bookedCount, date: bookedDate });
    } catch {
      toast({ title: 'Error', description: 'Failed to book.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  if (!profileReady) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-warning/30">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Complete Your Profile First</h2>
            <p className="text-muted-foreground text-sm">You need to complete your profile and medical history before booking.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedTimesSet = new Set(members.map(m => m.appointment_time).filter(Boolean));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Book for Others</h1>
        <p className="text-sm text-muted-foreground">Book for family members, friends, or include yourself</p>
      </div>

      {/* Include Self Toggle */}
      <Card className="border-border/50">
        <CardContent className="p-4 flex items-center gap-3">
          <Checkbox checked={includeSelf} onCheckedChange={(c) => setIncludeSelf(c === true)} />
          <div>
            <p className="text-sm font-medium text-foreground">Include myself in this booking</p>
            <p className="text-xs text-muted-foreground">Your profile & medical info will be auto-filled</p>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="border-border/50" ref={membersCardRef}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Members ({members.length}/5)</CardTitle>
            <Button variant="outline" size="sm" onClick={addMember} disabled={members.length >= 5} className="gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member, i) => {
            const isSelf = member.relationship === 'Self';
            const isExpanded = expandedMember === i;
            return (
              <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedMember(isExpanded ? -1 : i)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {member.member_name || `Member ${i + 1}`}
                      {isSelf && <span className="text-secondary ml-1">(You)</span>}
                    </span>
                    {member.appointment_time && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{member.appointment_time}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isSelf && members.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); removeMember(i); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3 pt-0 space-y-3 border-t border-border/30">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Full Name *</Label>
                        <Input value={member.member_name} onChange={e => updateMember(i, { member_name: e.target.value.slice(0, 30) })} disabled={isSelf} className="h-9" maxLength={30} />
                      </div>
                      <div>
                        <Label className="text-xs">Date of Birth *</Label>
                        <Input type="date" value={member.date_of_birth} onChange={e => updateMember(i, { date_of_birth: e.target.value })} disabled={isSelf} className="h-9" />
                      </div>
                      <div>
                        <Label className="text-xs">Gender *</Label>
                        <Select value={member.gender} onValueChange={v => updateMember(i, { gender: v })} disabled={isSelf}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Relationship *</Label>
                        <Select value={member.relationship} onValueChange={v => updateMember(i, { relationship: v })} disabled={isSelf}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.filter(r => r !== 'Self' || isSelf).map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Phone (optional)</Label>
                        <Input value={member.phone} onChange={e => updateMember(i, { phone: e.target.value })} disabled={isSelf} className="h-9" placeholder="Phone number" />
                      </div>
                    </div>

                    {/* Time Slot for this member */}
                    {selectedDate && timeSlots.length > 0 && (
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Time Slot *</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mt-1">
                          {timeSlots.map(slot => {
                            const globalBooked = bookedSlots.has(slot.value);
                            const takenByOther = selectedTimesSet.has(slot.value) && member.appointment_time !== slot.value;
                            // Block past time slots if selected date is today
                            const isPastTime = selectedDate === todayStr && (() => {
                              const [h, m] = slot.value.split(':').map(Number);
                              const now = new Date();
                              return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
                            })();
                            const unavailable = !slot.available || globalBooked || takenByOther || isPastTime;
                            const isSelected = slot.value === member.appointment_time;
                            return (
                              <button key={slot.value} type="button" disabled={unavailable} onClick={() => updateMember(i, { appointment_time: slot.value })} className={cn(
                                'rounded border p-1.5 text-[10px] font-medium transition-colors',
                                unavailable && 'cursor-not-allowed border-border/50 text-muted-foreground/30 line-through',
                                !unavailable && !isSelected && 'border-border text-foreground hover:border-secondary/50',
                                isSelected && 'border-secondary bg-secondary text-secondary-foreground',
                              )}>
                                {slot.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Medical Assessment */}
                    {!isSelf && (
                      <div className="border-t border-border/30 pt-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical History</p>
                        {[
                          { key: 'med_q1', text: 'In good health currently?', detailKey: '' },
                          { key: 'med_q2', text: 'Undergoing medical treatment?', detailKey: 'med_q2_details' },
                          { key: 'med_q3', text: 'Taking maintenance medications?', detailKey: 'med_q3_details' },
                          { key: 'med_q4', text: 'Hospitalized for serious illness?', detailKey: 'med_q4_details' },
                          { key: 'med_q5', text: 'Known allergies?', detailKey: 'med_q5_details' },
                          { key: 'med_q6', text: 'Currently pregnant or nursing?', detailKey: '' },
                        ].map(q => (
                          <div key={q.key} className="space-y-1">
                            <p className="text-xs text-foreground">{q.text}</p>
                            <div className="flex gap-3">
                              {(['yes', 'no'] as const).map(v => (
                                <label key={v} className="flex items-center gap-1 text-xs cursor-pointer">
                                  <input type="radio" checked={(member as Record<string, unknown>)[q.key] === v}
                                    onChange={() => updateMember(i, { [q.key]: v } as Record<string, unknown>)} className="accent-secondary" />
                                  {v === 'yes' ? 'Yes' : 'No'}
                                </label>
                              ))}
                            </div>
                            {q.detailKey && (member as Record<string, unknown>)[q.key] === 'yes' && (
                              <Input className="h-8 text-xs" placeholder="Please specify"
                                value={String((member as Record<string, unknown>)[q.detailKey] || '')}
                                onChange={e => updateMember(i, { [q.detailKey]: e.target.value } as Record<string, unknown>)} />
                            )}
                          </div>
                        ))}
                        <div className="flex items-start gap-2 pt-2">
                          <Checkbox checked={member.med_consent} onCheckedChange={c => updateMember(i, { med_consent: c === true })} className="mt-0.5" />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            I acknowledge the medical information provided is truthful and accurate.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{monthLabel}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(year, month - 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(year, month + 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast = dateStr < todayStr;
              const dow = new Date(year, month, day).getDay();
              const sDay = getScheduleForDay(dow);
              const isClosed = sDay ? !sDay.is_open : dow === 0;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const disabled = isPast || isClosed;
              return (
                <button key={dateStr} disabled={disabled} onClick={() => {
                  setSelectedDate(dateStr);
                  setMembers(prev => prev.map(m => ({ ...m, appointment_time: '' })));
                  setExpandedMember(0);
                  // Scroll back up to members section after a brief delay for state update
                  setTimeout(() => {
                    membersCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                  className={cn(
                    'rounded-lg p-2 text-sm font-medium transition-colors',
                    disabled && 'cursor-not-allowed text-muted-foreground/30',
                    !disabled && !isSelected && 'hover:bg-mint text-foreground',
                    isSelected && 'bg-secondary text-secondary-foreground',
                    isToday && !isSelected && 'ring-1 ring-secondary',
                  )}>
                  {day}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <p className="text-sm text-secondary mt-2 font-medium">
              Selected: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleBook} className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Booking...' : `Book for ${members.length} member${members.length !== 1 ? 's' : ''}`}
      </Button>

      <SuccessModal
        open={successModal.open}
        title="Companion Booking Confirmed!"
        description={`${successModal.count} member(s) booked for ${successModal.date ? new Date(successModal.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}. Pending admin approval.`}
        onClose={() => {
          setSuccessModal({ open: false, count: 0, date: '' });
          if (onNavigate) onNavigate('dashboard');
        }}
      />
    </div>
  );
}
