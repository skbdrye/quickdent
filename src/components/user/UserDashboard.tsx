import { useEffect, useState } from 'react';
import { CalendarDays, Clock, ClipboardCheck, X } from 'lucide-react';
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
  const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== 'Cancelled');
  const pending = appointments.filter(a => a.status === 'Pending');
  const confirmed = appointments.filter(a => a.status === 'Confirmed');

  const stats = [
    { icon: CalendarDays, label: 'Upcoming', value: upcoming.length, bg: 'bg-primary/10', color: 'text-primary' },
    { icon: Clock, label: 'Pending', value: pending.length, bg: 'bg-warning/10', color: 'text-warning' },
    { icon: ClipboardCheck, label: 'Confirmed', value: confirmed.length, bg: 'bg-success/10', color: 'text-success' },
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.username || 'Patient'}</h1>
        <p className="text-sm text-muted-foreground">{todayFormatted}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ icon: Icon, label, value, bg, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {upcoming.length > 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-4">Upcoming Appointments</h3>
            <div className="space-y-3">
              {upcoming.slice(0, 5).map(apt => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/30">
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {apt.is_group_booking ? 'Group Booking' : 'Dental Appointment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {apt.appointment_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                    {canCancel(apt) && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => setCancelId(apt.id)}>
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {upcoming.length > 5 && (
              <Button variant="link" size="sm" className="mt-3 text-secondary" onClick={() => onNavigate('appointments')}>
                View all appointments
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No upcoming appointments</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Book your first appointment to get started.</p>
            <Button className="mt-4" size="sm" onClick={() => onNavigate('appointments')}>Book Appointment</Button>
          </CardContent>
        </Card>
      )}

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
