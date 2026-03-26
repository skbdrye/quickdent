import { CalendarDays, Clock, ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore, useAppointmentsStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

export function UserDashboard() {
  const { user } = useAuthStore();
  const { appointments } = useAppointmentsStore();

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const userApts = appointments.filter(a => a.patient === user?.username);
  const upcoming = userApts.filter(a => a.appointmentDate >= today && a.status !== 'Declined');
  const pending = userApts.filter(a => a.status === 'Pending');
  const approved = userApts.filter(a => a.status === 'Approved');

  const stats = [
    { icon: CalendarDays, label: 'Upcoming', value: upcoming.length, bg: 'bg-primary/10', color: 'text-primary' },
    { icon: Clock, label: 'Pending', value: pending.length, bg: 'bg-warning/10', color: 'text-warning' },
    { icon: ClipboardCheck, label: 'Approved', value: approved.length, bg: 'bg-success/10', color: 'text-success' },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'approved' as const;
      case 'Pending': return 'pending' as const;
      case 'Declined': return 'declined' as const;
      case 'Completed': return 'completed' as const;
      default: return 'default' as const;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.username || 'Patient'}</h1>
        <p className="text-sm text-muted-foreground mt-1">{todayFormatted}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ icon: Icon, label, value, bg, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-11 w-11 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${color}`} />
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
                <div key={apt.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm text-foreground">{apt.reason || 'General Visit'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(apt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {apt.appointmentTime24}
                      {apt.isGroupBooking && ' (Group)'}
                    </p>
                  </div>
                  <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-10 text-center">
            <p className="font-medium text-foreground">No upcoming appointments</p>
            <p className="text-sm text-muted-foreground mt-1">Book your first appointment to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
