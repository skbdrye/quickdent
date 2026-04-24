import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, ClipboardCheck, Users, ArrowRight, Activity, Info, AlertTriangle, Image } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, useAppointmentsStore, useProfileStore } from '@/lib/store';
import { statusVariant } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { usersAPI } from '@/lib/api';
import type { DashboardPage } from '@/lib/types';

interface UserDashboardProps {
  onNavigate: (page: DashboardPage) => void;
  onViewAppointment?: (appointmentId?: number) => void;
}

export function UserDashboard({ onNavigate, onViewAppointment }: UserDashboardProps) {
  const { user } = useAuthStore();
  const { appointments, fetchUserAppointments } = useAppointmentsStore();
  const { profile, fetchProfile } = useProfileStore();
  const [isFirstLogin, setIsFirstLogin] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchUserAppointments(user.id);
      fetchProfile(user.id);
    }
  }, [user?.id, fetchUserAppointments, fetchProfile]);

  // Detect first login. Source of truth is users.first_login_at; localStorage is a fallback.
  useEffect(() => {
    if (!user?.id) return;
    const lsKey = `qd_first_login_seen_${user.id}`;
    let cancelled = false;
    (async () => {
      const ts = await usersAPI.getFirstLogin(user.id);
      if (cancelled) return;
      if (ts === null) {
        const seenLocal = typeof window !== 'undefined' && window.localStorage.getItem(lsKey);
        if (seenLocal) {
          setIsFirstLogin(false);
        } else {
          setIsFirstLogin(true);
          if (typeof window !== 'undefined') window.localStorage.setItem(lsKey, '1');
          // Best-effort persist (no-op if column missing)
          usersAPI.markFirstLogin(user.id);
        }
      } else {
        setIsFirstLogin(false);
        if (typeof window !== 'undefined') window.localStorage.setItem(lsKey, '1');
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const today = new Date().toISOString().split('T')[0];

  const { upcoming, pending, confirmed, completed } = useMemo(() => {
    const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== 'Cancelled' && a.status !== 'Completed' && a.status !== 'No Show');
    const pending = appointments.filter(a => a.status === 'Pending');
    const confirmed = appointments.filter(a => a.status === 'Confirmed');
    const completed = appointments.filter(a => a.status === 'Completed');
    return { upcoming, pending, confirmed, completed };
  }, [appointments, today]);

  const greetingName = (profile?.first_name && profile.first_name.trim()) || user?.username || 'Patient';
  const greeting = isFirstLogin ? 'Welcome' : 'Welcome back';

  const stats = [
    { icon: CalendarDays, label: 'Upcoming', value: upcoming.length, bg: 'bg-blue-50 dark:bg-blue-950/30', color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800' },
    { icon: Clock, label: 'Pending', value: pending.length, bg: 'bg-amber-50 dark:bg-amber-950/30', color: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' },
    { icon: ClipboardCheck, label: 'Confirmed', value: confirmed.length, bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    { icon: Activity, label: 'Completed', value: completed.length, bg: 'bg-violet-50 dark:bg-violet-950/30', color: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' },
  ];

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}, {greetingName}</h1>
          <p className="text-sm text-muted-foreground">{todayFormatted}</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start sm:self-auto" onClick={() => onNavigate('appointments')}>
          <CalendarDays className="w-4 h-4" /> Book Appointment
        </Button>
      </div>

      {/* Booking Rules Banner */}
      <Card className="border-secondary/20 bg-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4 text-secondary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Booking Rules</p>
              <ul className="text-xs text-foreground/80 space-y-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-secondary mt-0.5">&#8226;</span>
                  <span>Cancellations must be made at least <strong className="text-foreground">1 day (24 hours)</strong> before your appointment.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-secondary mt-0.5">&#8226;</span>
                  <span>Rescheduling is allowed <strong className="text-foreground">1 time only</strong>, at least 1 day before the appointment.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5"><AlertTriangle className="w-3 h-3" /></span>
                  <span><strong className="text-foreground">3 no-shows will result in an account ban.</strong> Please cancel in advance if you cannot attend.</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value, bg, color, ring }) => (
          <Card key={label} className={`border-border/50 ring-1 ${ring} overflow-hidden`}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming appointments (VIEW ONLY - click to navigate) */}
      {upcoming.length > 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Upcoming Appointments</h3>
              <Badge variant="outline" className="text-[10px]">{upcoming.length} total</Badge>
            </div>
            <div className="space-y-2.5">
              {upcoming.slice(0, 5).map(apt => (
                <button
                  key={apt.id}
                  onClick={() => onViewAppointment?.(apt.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 hover:border-secondary/30 transition-all w-full text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors">
                      {apt.is_group_booking ? <Users className="w-4 h-4 text-secondary" /> : <CalendarDays className="w-4 h-4 text-secondary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {apt.is_group_booking ? 'Companion Booking' : 'Dental Appointment'}
                      </p>
                      {apt.service && apt.status === 'Confirmed' && (
                        <p className="text-xs text-secondary font-medium">
                          Service: {apt.service}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(apt.appointment_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
            {upcoming.length > 5 && (
              <Button variant="link" size="sm" className="mt-3 text-secondary gap-1" onClick={() => onViewAppointment?.()}>
                View all appointments <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-7 h-7 text-secondary" />
            </div>
            <p className="font-medium text-foreground">No upcoming appointments</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Schedule your next dental visit to keep your smile healthy.</p>
            <Button size="sm" className="gap-1.5" onClick={() => onNavigate('appointments')}>
              Book Appointment <ArrowRight className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Book for Others', desc: 'Schedule for family & friends', page: 'group-booking' as DashboardPage },
          { icon: Clock, label: 'Standby Queue', desc: 'Request when fully booked', page: 'standby' as DashboardPage },
          { icon: Activity, label: 'Services', desc: 'View available treatments', page: 'services' as DashboardPage },
          { icon: ClipboardCheck, label: 'Prescriptions', desc: 'View your prescriptions', page: 'prescriptions' as DashboardPage },
          { icon: Image, label: 'X-Rays', desc: 'View your dental x-rays', page: 'xrays' as DashboardPage },
        ].map(({ icon: Icon, label, desc, page }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-secondary/30 hover:shadow-sm transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors">
              <Icon className="w-4 h-4 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
