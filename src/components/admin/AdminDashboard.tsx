import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CalendarCheck, Clock, TrendingUp, ArrowRight, LayoutDashboard, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTime } from '@/lib/utils';
import type { AdminPage } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

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
  is_group_booking: boolean;
  group_member_names?: string[];
}

interface AdminDashboardProps {
  onNavigate?: (page: AdminPage) => void;
  /** Optional escape hatch so a click on a recent-appointment row can both
   *  navigate AND highlight that specific appointment in the AppointmentManagement table. */
  onNavigateToAppointment?: (appointmentId?: number | null) => void;
}

export default function AdminDashboard({ onNavigate, onNavigateToAppointment }: AdminDashboardProps) {
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

    const [patientsRes, groupMembersRes, todayRes, pendingRes, completedRes] = await Promise.all([
      supabase.from('patient_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('group_members').select('id', { count: 'exact', head: true }).is('linked_user_id', null),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today).neq('status', 'Cancelled'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'Completed').eq('appointment_date', today),
    ]);

    setStats({
      totalPatients: (patientsRes.count || 0) + (groupMembersRes.count || 0),
      todayAppointments: todayRes.count || 0,
      pendingAppointments: pendingRes.count || 0,
      completedToday: completedRes.count || 0,
    });
  }

  async function loadRecentAppointments() {
    const { data } = await supabase
      .from('appointments')
      .select('id, patient_name, appointment_date, appointment_time, status, is_group_booking')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!data) {
      setRecentAppointments([]);
      return;
    }

    // For group bookings, fetch member names
    const groupIds = data.filter(a => a.is_group_booking).map(a => a.id);
    const memberMap = new Map<number, string[]>();

    if (groupIds.length > 0) {
      const { data: members } = await supabase
        .from('group_members')
        .select('appointment_id, member_name')
        .in('appointment_id', groupIds);

      if (members) {
        for (const m of members) {
          const existing = memberMap.get(m.appointment_id) || [];
          existing.push(m.member_name);
          memberMap.set(m.appointment_id, existing);
        }
      }
    }

    setRecentAppointments(data.map(a => ({
      ...a,
      is_group_booking: a.is_group_booking || false,
      group_member_names: a.is_group_booking ? memberMap.get(a.id) : undefined,
    })));
  }

  const statCards = [
    { title: 'Total Patients', value: stats.totalPatients, icon: Users, bg: 'bg-blue-50 dark:bg-blue-950/30', color: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800' },
    { title: "Today's Appointments", value: stats.todayAppointments, icon: CalendarCheck, bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    { title: 'Pending', value: stats.pendingAppointments, icon: Clock, bg: 'bg-amber-50 dark:bg-amber-950/30', color: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' },
    { title: 'Completed Today', value: stats.completedToday, icon: TrendingUp, bg: 'bg-violet-50 dark:bg-violet-950/30', color: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800' },
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

  const handleAppointmentClick = (appointmentId?: number) => {
    if (onNavigateToAppointment) {
      onNavigateToAppointment(appointmentId ?? null);
    } else if (onNavigate) {
      onNavigate('appointments');
    }
  };

  const todayFormatted = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }), []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow={todayFormatted}
        title="Welcome back, Admin"
        description="Here's a snapshot of clinic activity in real time."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/50 overflow-hidden relative group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div aria-hidden className={`pointer-events-none absolute -right-6 -top-6 w-20 h-20 rounded-full ${stat.bg} blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
            <CardContent className="p-4 flex items-center gap-3 relative">
              <div className={`p-2.5 rounded-xl ${stat.bg} ring-1 ${stat.ring} shrink-0`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium truncate">{stat.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-br from-mint/40 to-transparent border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-card text-secondary ring-1 ring-secondary/15">
                <CalendarDays className="w-4 h-4" />
              </span>
              Recent Appointments
            </CardTitle>
            <button
              onClick={() => handleAppointmentClick()}
              className="text-xs text-secondary hover:text-secondary/80 inline-flex items-center gap-1 font-semibold transition-all hover:translate-x-0.5"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {recentAppointments.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No appointments yet"
              description="As soon as a patient books, you'll see it here."
              tone="muted"
            />
          ) : (
            <div className="space-y-2">
              {recentAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card cursor-pointer hover:bg-mint/30 border border-border/40 hover:border-secondary/30 transition-all duration-200 group"
                  onClick={() => handleAppointmentClick(apt.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ring-1 ${apt.is_group_booking ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-800' : 'bg-mint text-secondary ring-secondary/15'}`}>
                      {apt.is_group_booking ? <Users className="w-4 h-4" /> : <CalendarCheck className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate text-sm">
                          {apt.is_group_booking && apt.group_member_names
                            ? apt.group_member_names.join(', ')
                            : apt.patient_name}
                        </p>
                        {apt.is_group_booking && (
                          <Badge variant="outline" className="text-[10px] shrink-0 gap-0.5">
                            <Users className="w-3 h-3" />
                            {apt.group_member_names && apt.group_member_names.length === 1 ? 'Companion' : 'Group'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} &middot; {formatTime(apt.appointment_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getStatusVariant(apt.status) as "pending" | "confirmed" | "completed" | "cancelled" | "noshow"}>
                      {apt.status}
                    </Badge>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
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
