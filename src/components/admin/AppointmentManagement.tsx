import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppointmentsStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'Pending' | 'Approved' | 'Declined' | 'Completed';

export function AppointmentManager() {
  const { appointments, updateStatus, deleteAppointment } = useAppointmentsStore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const handleApprove = (id: number) => {
    updateStatus(id, 'Approved');
    toast({ title: 'Approved', description: 'Appointment has been approved' });
  };
  const handleDecline = (id: number) => {
    updateStatus(id, 'Declined');
    toast({ title: 'Declined', description: 'Appointment has been declined' });
  };
  const handleDelete = (id: number) => {
    deleteAppointment(id);
    toast({ title: 'Deleted', description: 'Appointment removed' });
  };

  const filters: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Declined', label: 'Declined' },
    { value: 'Completed', label: 'Completed' },
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
        <h1 className="text-2xl font-bold text-foreground">Manage Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">Approve, decline, or manage patient bookings</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === f.value
                ? 'border-secondary bg-secondary text-secondary-foreground'
                : 'border-border text-muted-foreground hover:border-secondary/50'
            )}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1.5 opacity-60">{appointments.filter(a => a.status === f.value).length}</span>
            )}
          </button>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-4">
            {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
          </p>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No appointments found</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(apt => (
                <div key={apt.id} className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{apt.patient}</p>
                        <Badge variant={statusVariant(apt.status)}>{apt.status}</Badge>
                        {apt.isGroupBooking && <Badge variant="mint">Group</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{apt.reason || 'General Visit'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {apt.appointmentTime24}
                      </p>
                      {apt.contact && <p className="text-xs text-muted-foreground">Contact: {apt.contact}</p>}
                      {apt.groupMembers && apt.groupMembers.length > 0 && (
                        <p className="text-xs text-secondary">Members: {apt.groupMembers.map(m => m.name).join(', ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {apt.status === 'Pending' && (
                        <>
                          <Button variant="default" size="sm" onClick={() => handleApprove(apt.id)} className="gap-1 h-8">
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDecline(apt.id)} className="gap-1 h-8">
                            <X className="h-3.5 w-3.5" /> Decline
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(apt.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
