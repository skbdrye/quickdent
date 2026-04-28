import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, ClipboardCheck, Users, ArrowRight, Activity, Info, AlertTriangle, Image, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, useAppointmentsStore, useProfileStore } from '@/lib/store';
import { statusVariant } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { usersAPI } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
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
      <PageHeader
        icon={Sparkles}
        eyebrow={<><span>{todayFormatted}</span></>}
        title={`${greeting}, ${greetingName}`}
        description="Your dental care dashboard — quick stats, upcoming visits, and one-tap actions."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => onNavigate('appointments')}>
            <CalendarDays className="w-4 h-4" /> Book Appointment
          </Button>
        }
      />

      {/* Booking Rules Banner — compact, scannable, color-coded */}
      <Card className="border-secondary/20 overflow-hidden">
        <div className="bg-gradient-to-br from-mint/40 via-mint/15 to-transparent px-4 py-3 border-b border-border/40 flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-card text-secondary ring-1 ring-secondary/15">
            <Info className="w-3.5 h-3.5" />
          </span>
          <p className="text-sm font-semibold text-foreground">Booking Rules</p>
        </div>
        <CardContent className="p-4 grid sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-mint/30 border border-secondary/10">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-card text-secondary shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <div className="text-xs text-foreground/85">
              Cancel or reschedule at least <strong className="text-foreground">24 hours</strong> before your appointment.
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-card text-blue-600 dark:text-blue-400 shrink-0">
              <CalendarDays className="w-3.5 h-3.5" />
            </span>
            <div className="text-xs text-foreground/85">
              Reschedule allowed <strong className="text-foreground">1 time only</strong> per appointment.
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-card text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div className="text-xs text-foreground/85">
              <strong className="text-foreground">3 no-shows = account ban.</strong> Please cancel in advance.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ icon: Icon, label, value, bg, color, ring }) => (
          <Card key={label} className={`relative border-border/50 ring-1 ${ring} overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
            <div aria-hidden className={`absolute -right-6 -top-6 w-20 h-20 rounded-full ${bg} opacity-60 blur-xl`} />
            <CardContent className="relative p-4 flex flex-col items-center text-center gap-2">
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none tabular-nums">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">{label}</p>
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
        <EmptyState
          icon={CalendarDays}
          title="No upcoming appointments"
          description="Schedule your next dental visit to keep your smile healthy."
          action={{ label: 'Book Appointment', onClick: () => onNavigate('appointments'), icon: ArrowRight }}
        />
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
            className="group flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-secondary/40 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 group-hover:scale-105 transition-all">
              <Icon className="w-4 h-4 text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-secondary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
