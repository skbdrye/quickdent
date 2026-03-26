import { CalendarCheck, Clock, Users, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppointmentsStore } from '@/lib/store';

export function AdminDashboard() {
  const { appointments } = useAppointmentsStore();

  const today = new Date().toISOString().split('T')[0];
  const pending = appointments.filter(a => a.status === 'Pending');
  const todaysApts = appointments.filter(a => a.appointmentDate === today);
  const uniquePatients = new Set(appointments.map(a => a.patient));

  const stats = [
    { icon: CalendarCheck, label: 'Total Appointments', value: appointments.length, bg: 'bg-primary/10', color: 'text-primary' },
    { icon: Clock, label: 'Pending Requests', value: pending.length, bg: 'bg-warning/10', color: 'text-warning' },
    { icon: CalendarDays, label: "Today's Appointments", value: todaysApts.length, bg: 'bg-success/10', color: 'text-success' },
    { icon: Users, label: 'Total Patients', value: uniquePatients.size, bg: 'bg-secondary/10', color: 'text-secondary' },
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

  const recent = [...appointments]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 6);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, bg, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`h-11 w-11 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
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

      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground mb-4">Recent Appointments</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No appointments yet</p>
          ) : (
            <div className="space-y-3">
              {recent.map(apt => (
                <div key={apt.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {apt.patient}
                      {apt.isGroupBooking && <span className="text-xs text-secondary ml-1.5">(Group)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {apt.reason || 'General'} &middot;{' '}
                      {new Date(apt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {apt.appointmentTime24}
                    </p>
                  </div>
                  <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
