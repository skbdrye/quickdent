import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppointmentsStore, useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Clock, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

const SERVICES = [
  'Dental Pain', 'Checkup', 'Cleaning', 'Filling (Pasta)',
  'Extraction (Bunot)', 'Veneers / Crowns / Bridge', 'Braces',
  'Wisdom Tooth Removal', 'Root Canal Treatment', 'Whitening',
];

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

export function AppointmentBooking() {
  const { addAppointment, appointments } = useAppointmentsStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
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

  const toggleService = (s: string) => {
    setSelectedServices(prev =>
      prev.includes(s)
        ? prev.filter(x => x !== s)
        : prev.length >= 3
          ? (toast({ title: 'Limit', description: 'Max 3 services', variant: 'destructive' }), prev)
          : [...prev, s]
    );
  };

  const handleBook = () => {
    if (!selectedDate || !selectedTime || selectedServices.length === 0) {
      toast({ title: 'Incomplete', description: 'Please select service, date, and time', variant: 'destructive' });
      return;
    }
    const exists = appointments.some(
      a => a.appointmentDate === selectedDate && a.appointmentTime24 === selectedTime && a.patient === (user?.username || '')
    );
    if (exists) {
      toast({ title: 'Duplicate', description: 'You already have an appointment at this slot', variant: 'destructive' });
      return;
    }
    addAppointment({
      patient: user?.username || 'Patient',
      userId: user?.id,
      appointmentDate: selectedDate,
      appointmentTime24: selectedTime,
      durationMin: 30,
      reason: selectedServices.join(', '),
      provider: 'Dr. Dentist',
      contact: user?.phone || '',
      notes: '',
    });
    toast({ title: 'Booked!', description: 'Your appointment request has been submitted. Pending admin approval.' });
    setSelectedServices([]);
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
        <h1 className="text-2xl font-bold text-foreground">Book Appointment</h1>
        <p className="text-sm text-muted-foreground mt-1">Select a service, pick a date and time</p>
      </div>

      {/* Services */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-secondary" /> Reason for Visit
          </CardTitle>
          <p className="text-xs text-muted-foreground">Pick up to 3 services</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map(s => (
              <button
                key={s}
                onClick={() => toggleService(s)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  selectedServices.includes(s)
                    ? 'border-secondary bg-secondary text-secondary-foreground'
                    : 'border-border text-muted-foreground hover:border-secondary/50 hover:text-foreground'
                )}
              >
                {s}
              </button>
            ))}
          </div>
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
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-secondary" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted-foreground/20" /> Closed</span>
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
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
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
                      {booked && <Badge variant="warning" className="ml-1 text-[10px] px-1.5">Booked</Badge>}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button className="w-full" size="lg" onClick={handleBook}>
        Book Appointment
      </Button>
    </div>
  );
}
