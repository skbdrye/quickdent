import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CalendarCheck, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StatsData {
  totalPatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedToday: number;
}

interface RecentAppointment {
  id: number;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData>({ totalPatients: 0, todayAppointments: 0, pendingAppointments: 0, completedToday: 0 });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentAppointments();

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadStats();
        loadRecentAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadStats() {
    const today = new Date().toISOString().split('T')[0];

    const [patientsRes, todayRes, pendingRes, completedRes] = await Promise.all([
      supabase.from('patient_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'Completed').eq('appointment_date', today),
    ]);

    setStats({
      totalPatients: patientsRes.count || 0,
      todayAppointments: todayRes.count || 0,
      pendingAppointments: pendingRes.count || 0,
      completedToday: completedRes.count || 0,
    });
  }

  async function loadRecentAppointments() {
    const { data } = await supabase
      .from('appointments')
      .select('id, patient_name, appointment_date, appointment_time, status')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentAppointments(data || []);
  }

  const statCards = [
    { title: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-blue-600' },
    { title: "Today's Appointments", value: stats.todayAppointments, icon: CalendarCheck, color: 'text-green-600' },
    { title: 'Pending', value: stats.pendingAppointments, icon: Clock, color: 'text-amber-600' },
    { title: 'Completed Today', value: stats.completedToday, icon: TrendingUp, color: 'text-emerald-600' },
  ];

  function getStatusVariant(status: string) {
    switch (status) {
      case 'Confirmed': return 'confirmed';
      case 'Completed': return 'completed';
      case 'Cancelled': return 'cancelled';
      case 'No Show': return 'noshow';
      default: return 'pending';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Admin</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No appointments yet</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">{apt.patient_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {apt.appointment_time}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(apt.status) as "pending" | "confirmed" | "completed" | "cancelled" | "noshow"}>
                    {apt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
