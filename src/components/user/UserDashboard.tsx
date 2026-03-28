import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, Clock, ClipboardCheck, X, Users, ArrowRight, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore, useAppointmentsStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { statusVariant } from '@/lib/types';
import type { DashboardPage } from '@/lib/types';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserDashboardProps {
  onNavigate: (page: DashboardPage) => void;
}

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { user } = useAuthStore();
  const { appointments, fetchUserAppointments, updateStatus } = useAppointmentsStore();
  const { toast } = useToast();
  const [cancelId, setCancelId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) fetchUserAppointments(user.id);
  }, [user?.id, fetchUserAppointments]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const today = new Date().toISOString().split('T')[0];

  const { upcoming, pending, confirmed, completed } = useMemo(() => {
    const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== 'Cancelled' && a.status !== 'Completed');
    const pending = appointments.filter(a => a.status === 'Pending');
    const confirmed = appointments.filter(a => a.status === 'Confirmed');
    const completed = appointments.filter(a => a.status === 'Completed');
    return { upcoming, pending, confirmed, completed };
  }, [appointments, today]);

  const stats = [
    { icon: CalendarDays, label: 'Upcoming', value: upcoming.length, bg: 'bg-blue-50 dark:bg-blue-950/30', color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800' },
    { icon: Clock, label: 'Pending', value: pending.length, bg: 'bg-amber-50 dark:bg-amber-950/30', color: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' },
    { icon: ClipboardCheck, label: 'Confirmed', value: confirmed.length, bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    { icon: Activity, label: 'Completed', value: completed.length, bg: 'bg-violet-50 dark:bg-violet-950/30', color: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' },
  ];

  const canCancel = (apt: typeof appointments[0]) => {
    if (apt.status !== 'Pending' && apt.status !== 'Confirmed') return false;
    const aptDate = new Date(apt.appointment_date + 'T' + apt.appointment_time);
    const now = new Date();
    const hoursUntil = (aptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil >= 24;
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await updateStatus(cancelId, 'Cancelled');
      toast({ title: 'Cancelled', description: 'Your appointment has been cancelled.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel appointment.', variant: 'destructive' });
    }
    setCancelId(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.username || 'Patient'}</h1>
          <p className="text-sm text-muted-foreground">{todayFormatted}</p>
        </div>
        <Button size="sm" className="gap-1.5 self-start sm:self-auto" onClick={() => onNavigate('appointments')}>
          <CalendarDays className="w-4 h-4" /> Book Appointment
        </Button>
      </div>

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

      {/* Upcoming appointments */}
      {upcoming.length > 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Upcoming Appointments</h3>
              <Badge variant="outline" className="text-[10px]">{upcoming.length} total</Badge>
            </div>
            <div className="space-y-2.5">
              {upcoming.slice(0, 5).map(apt => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                      {apt.is_group_booking ? <Users className="w-4 h-4 text-secondary" /> : <CalendarDays className="w-4 h-4 text-secondary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {apt.is_group_booking ? 'Group Booking' : 'Dental Appointment'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {apt.appointment_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                    {canCancel(apt) && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => setCancelId(apt.id)} title="Cancel appointment">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {upcoming.length > 5 && (
              <Button variant="link" size="sm" className="mt-3 text-secondary gap-1" onClick={() => onNavigate('appointments')}>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Book for Others', desc: 'Schedule for family & friends', page: 'group-booking' as DashboardPage },
          { icon: Activity, label: 'Services', desc: 'View available treatments', page: 'services' as DashboardPage },
          { icon: ClipboardCheck, label: 'Prescriptions', desc: 'View your prescriptions', page: 'prescriptions' as DashboardPage },
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

      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
