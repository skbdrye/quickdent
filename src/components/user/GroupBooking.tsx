import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppointmentsStore, useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Clock, Users, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GroupMember } from '@/lib/types';

const SERVICES = [
  'Dental Pain', 'Checkup', 'Cleaning', 'Filling (Pasta)',
  'Extraction (Bunot)', 'Veneers / Crowns / Bridge', 'Braces',
  'Wisdom Tooth Removal', 'Root Canal Treatment', 'Whitening',
];

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Friend'];

function generateTimeSlots() {
  const slots: { label: string; value: string; available: boolean }[] = [];
  for (let h = 8; h < 18; h++) {
    for (const m of [0, 30]) {
      const h24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const hEnd = m === 30 ? h + 1 : h;
      const mEnd = m === 30 ? 0 : 30;
      const fmt = (hr: number, mn: number) => {
        const d = new Date();
        d.setHours(hr, mn);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      };
      const beforeNine = h * 60 + m < 9 * 60;
      const lunch = h * 60 + m >= 12 * 60 && h * 60 + m < 13 * 60;
      slots.push({
        label: `${fmt(h, m)} - ${fmt(hEnd, mEnd)}`,
        value: h24,
        available: !beforeNine && !lunch,
      });
    }
  }
  return slots;
}

const emptyMember = (): GroupMember => ({
  name: '', age: null, relationship: '', service: '',
});

export function GroupBooking() {
  const { addAppointment, appointments } = useAppointmentsStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [members, setMembers] = useState<GroupMember[]>([emptyMember(), emptyMember()]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const updateMember = (index: number, data: Partial<GroupMember>) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, ...data } : m));
  };

  const addMember = () => {
    if (members.length >= 6) {
      toast({ title: 'Limit reached', description: 'Maximum 6 members per group booking', variant: 'destructive' });
      return;
    }
    setMembers(prev => [...prev, emptyMember()]);
  };

  const removeMember = (index: number) => {
    if (members.length <= 2) {
      toast({ title: 'Minimum', description: 'Group booking requires at least 2 members', variant: 'destructive' });
      return;
    }
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleBook = () => {
    if (!selectedDate || !selectedTime) {
      toast({ title: 'Incomplete', description: 'Please select date and time', variant: 'destructive' });
      return;
    }
    const invalid = members.some(m => !m.name || !m.service || !m.relationship);
    if (invalid) {
      toast({ title: 'Incomplete', description: 'Please fill in all member details', variant: 'destructive' });
      return;
    }

    const services = members.map(m => m.service).join(', ');
    const memberNames = members.map(m => m.name).join(', ');

    addAppointment({
      patient: user?.username || 'Patient',
      userId: user?.id,
      appointmentDate: selectedDate,
      appointmentTime24: selectedTime,
      durationMin: 30 * members.length,
      reason: `Group Booking (${members.length} members): ${services}`,
      provider: 'Dr. Dentist',
      contact: user?.phone || '',
      notes: `Group members: ${memberNames}`,
      isGroupBooking: true,
      groupMembers: members,
    });

    toast({ title: 'Group Booked!', description: `Appointment for ${members.length} members submitted. Pending admin approval.` });
    setMembers([emptyMember(), emptyMember()]);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const bookedSlots = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    return new Set(
      appointments
        .filter(a => a.appointmentDate === selectedDate && (a.status === 'Pending' || a.status === 'Approved'))
        .map(a => a.appointmentTime24)
    );
  }, [selectedDate, appointments]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Group Booking</h1>
        <p className="text-sm text-muted-foreground mt-1">Book appointments for multiple family members or friends at once</p>
      </div>

      {/* Members */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" /> Group Members ({members.length})
            </CardTitle>
            <Button variant="mint" size="sm" onClick={addMember} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Member {i + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => removeMember(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    value={member.name}
                    onChange={e => updateMember(i, { name: e.target.value })}
                    placeholder="Full name"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Age</Label>
                  <Input
                    type="number"
                    value={member.age ?? ''}
                    onChange={e => updateMember(i, { age: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Age"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Relationship *</Label>
                  <Select value={member.relationship} onValueChange={v => updateMember(i, { relationship: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Service Needed *</Label>
                  <Select value={member.service} onValueChange={v => updateMember(i, { service: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">{monthLabel}</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(year, month - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(year, month + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPast = dateStr < todayStr;
                const isSunday = new Date(year, month, day).getDay() === 0;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const disabled = isPast || isSunday;
                return (
                  <button
                    key={dateStr}
                    disabled={disabled}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      'rounded-lg p-2 text-sm font-medium transition-colors',
                      disabled && 'cursor-not-allowed text-muted-foreground/30',
                      !disabled && !isSelected && 'hover:bg-mint text-foreground',
                      isSelected && 'bg-secondary text-secondary-foreground',
                      isToday && !isSelected && 'ring-1 ring-secondary',
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <p className="text-xs text-secondary font-medium mt-3">
                Selected: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Time slots */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-secondary" /> Time Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-8">Select a date first</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {timeSlots.map(slot => {
                  const booked = bookedSlots.has(slot.value);
                  const unavailable = !slot.available || booked;
                  const isSelected = slot.value === selectedTime;
                  return (
                    <button
                      key={slot.value}
                      disabled={unavailable}
                      onClick={() => setSelectedTime(slot.value)}
                      className={cn(
                        'rounded-lg border p-2.5 text-xs font-medium transition-colors',
                        unavailable && 'cursor-not-allowed border-border/50 text-muted-foreground/30 line-through',
                        !unavailable && !isSelected && 'border-border text-foreground hover:border-secondary/50',
                        isSelected && 'border-secondary bg-secondary text-secondary-foreground',
                      )}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button className="w-full" size="lg" onClick={handleBook}>
        Book Group Appointment ({members.length} members)
      </Button>
    </div>
  );
}
