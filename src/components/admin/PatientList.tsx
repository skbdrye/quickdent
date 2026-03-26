import { Card, CardContent } from '@/components/ui/card';
import { useAppointmentsStore } from '@/lib/store';
import { Users } from 'lucide-react';

export function PatientList() {
  const { appointments } = useAppointmentsStore();

  const patientMap = new Map<string, { count: number; lastDate: string; contact: string }>();
  appointments.forEach(apt => {
    const existing = patientMap.get(apt.patient);
    if (!existing || apt.appointmentDate > existing.lastDate) {
      patientMap.set(apt.patient, {
        count: (existing?.count || 0) + 1,
        lastDate: apt.appointmentDate,
        contact: apt.contact || existing?.contact || '',
      });
    } else {
      existing.count++;
    }
  });

  const patients = Array.from(patientMap.entries()).map(([name, data]) => ({
    name,
    ...data,
  }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patients</h1>
        <p className="text-sm text-muted-foreground mt-1">All registered patients from appointments</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Users className="h-3.5 w-3.5" />
            {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </div>
          {patients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No patients yet</p>
          ) : (
            <div className="space-y-3">
              {patients.map(p => (
                <div key={p.name} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{p.name}</p>
                      {p.contact && <p className="text-xs text-muted-foreground">{p.contact}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{p.count}</p>
                    <p className="text-xs text-muted-foreground">appointment{p.count !== 1 ? 's' : ''}</p>
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
