import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { FileText, Download, Eye, CalendarDays, Clock, Users, User, Stethoscope } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';

interface Prescription {
  id: number;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  image_url: string | null;
  prescribed_by: string;
  prescription_date: string;
  group_member_id: number | null;
  appointment_id: number | null;
}

interface GroupMemberPrescription extends Prescription {
  member_name?: string;
}

interface AppointmentGroup {
  appointment_id: number | null;
  appointment_date: string;
  appointment_time: string;
  is_group_booking: boolean;
  patient_name: string;
  service: string | null;
  status?: string;
  prescriptions: GroupMemberPrescription[];
}

interface PrescriptionsViewProps {
  highlightAppointmentId?: number | null;
  highlightKey?: number;
}

export default function PrescriptionsView({ highlightAppointmentId, highlightKey }: PrescriptionsViewProps) {
  const { user } = useAuthStore();
  const [appointmentGroups, setAppointmentGroups] = useState<AppointmentGroup[]>([]);
  const [viewingPrescriptions, setViewingPrescriptions] = useState<GroupMemberPrescription[] | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightingId, setHighlightingId] = useState<number | null>(null);

  // Scroll to and highlight the prescription card ONLY when triggered by notification (highlightKey > 0)
  useEffect(() => {
    if (highlightAppointmentId && highlightKey && highlightKey > 0 && !loading && appointmentGroups.length > 0) {
      setHighlightingId(highlightAppointmentId);
      setTimeout(() => {
        const el = document.getElementById(`rx-group-${highlightAppointmentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      const timer = setTimeout(() => {
        setHighlightingId(null);
      }, 3500);
      return () => clearTimeout(timer);
    } else if (!highlightAppointmentId) {
      setHighlightingId(null);
    }
  }, [highlightAppointmentId, highlightKey, loading, appointmentGroups]);

  const loadPrescriptions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // FIX: Load user's own prescriptions EXCLUDING group member prescriptions
    // This prevents duplication when admin gives prescription to a companion
    const { data: ownRx } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('user_id', user.id)
      .is('group_member_id', null)
      .order('prescription_date', { ascending: false });

    const allRx: GroupMemberPrescription[] = (ownRx || []).map((rx: Record<string, unknown>) => ({
      ...rx,
      member_name: undefined,
    }) as unknown as GroupMemberPrescription);

    // Load prescriptions for group members booked by this user
    const { data: groupAppts } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_group_booking', true);

    if (groupAppts && groupAppts.length > 0) {
      const aptIds = groupAppts.map((a) => a.id);
      const { data: members } = await supabase
        .from('group_members')
        .select('id, member_name')
        .in('appointment_id', aptIds);

      if (members && members.length > 0) {
        const memberIds = members.map((m) => m.id);
        const { data: memberRx } = await supabase
          .from('prescriptions')
          .select('*')
          .in('group_member_id', memberIds)
          .order('prescription_date', { ascending: false });

        if (memberRx) {
          memberRx.forEach((rx: Record<string, unknown>) => {
            const member = members.find((m) => m.id === rx.group_member_id);
            allRx.push({
              ...rx,
              member_name: member?.member_name || 'Unknown',
            } as unknown as GroupMemberPrescription);
          });
        }
      }
    }

    // Now group prescriptions by appointment_id and fetch appointment details
    const aptIdSet = new Set<number>();
    allRx.forEach((rx) => {
      if (rx.appointment_id) aptIdSet.add(rx.appointment_id);
    });

    const aptMap = new Map<number, { appointment_date: string; appointment_time: string; is_group_booking: boolean; patient_name: string; service: string | null }>();
    if (aptIdSet.size > 0) {
      const { data: apts } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, is_group_booking, patient_name, service')
        .in('id', Array.from(aptIdSet));
      if (apts) {
        apts.forEach((a) => aptMap.set(a.id, { ...a, service: a.service || null }));
      }
    }

    // Build appointment groups
    const groupMap = new Map<number | string, AppointmentGroup>();
    allRx.forEach((rx) => {
      const key = rx.appointment_id ?? `no-apt-${rx.id}`;
      if (!groupMap.has(key)) {
        const apt = rx.appointment_id ? aptMap.get(rx.appointment_id) : null;
        groupMap.set(key, {
          appointment_id: rx.appointment_id,
          appointment_date: apt?.appointment_date || rx.prescription_date,
          appointment_time: apt?.appointment_time || '',
          is_group_booking: apt?.is_group_booking || false,
          patient_name: apt?.patient_name || user.username || '',
          service: apt?.service || null,
          prescriptions: [],
        });
      }
      groupMap.get(key)!.prescriptions.push(rx);
    });

    // Sort by date descending
    const groups = Array.from(groupMap.values()).sort((a, b) =>
      b.appointment_date.localeCompare(a.appointment_date)
    );

    setAppointmentGroups(groups);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadPrescriptions();
  }, [user, loadPrescriptions]);

  const handleDownload = async (imageUrl: string, rxId: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescription_${rxId}.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
        <p className="text-muted-foreground">View prescriptions from your dental visits</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : appointmentGroups.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-foreground">No prescriptions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your prescriptions will appear here after your dental visits</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointmentGroups.map((group, idx) => (
            <Card
              key={group.appointment_id ?? `group-${idx}`}
              id={group.appointment_id ? `rx-group-${group.appointment_id}` : undefined}
              className={cn(
                'border-border/50 overflow-hidden transition-all duration-500 hover:shadow-sm',
                highlightingId === group.appointment_id && 'ring-2 ring-secondary ring-offset-2 shadow-md'
              )}
            >
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      {group.is_group_booking ? (
                        <Users className="w-5 h-5 text-secondary" />
                      ) : (
                        <User className="w-5 h-5 text-secondary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        {group.is_group_booking ? 'Companion Booking' : 'Dental Appointment'}
                      </p>
                      {group.service && (
                        <p className="text-xs text-secondary font-medium mt-0.5 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          Service: {group.service}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(group.appointment_date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                        {group.appointment_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(group.appointment_time)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {group.prescriptions.length} prescription{group.prescriptions.length > 1 ? 's' : ''}
                        </Badge>
                        {group.prescriptions.some(rx => rx.member_name) && (
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            Group
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 h-9 text-xs"
                    onClick={() => setViewingPrescriptions(group.prescriptions)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Prescription List Viewer Dialog */}
      <Dialog open={!!viewingPrescriptions} onOpenChange={() => setViewingPrescriptions(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescriptions</DialogTitle>
          </DialogHeader>
          {viewingPrescriptions && (
            <div className="space-y-4">
              {viewingPrescriptions.map((rx) => (
                <div key={rx.id} className="border border-border/50 rounded-xl overflow-hidden">
                  {/* Prescription header */}
                  <div className="p-3 flex items-center justify-between bg-muted/30 border-b border-border/30">
                    <div>
                      <p className="font-medium text-sm text-foreground">{rx.prescribed_by}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                    {rx.member_name && (
                      <Badge variant="outline" className="text-xs">
                        For: {rx.member_name}
                      </Badge>
                    )}
                  </div>

                  {/* Image or text content */}
                  {rx.image_url ? (
                    <div>
                      <div
                        className="relative cursor-pointer group bg-white"
                        onClick={() => setViewingImage(rx.image_url)}
                      >
                        <img
                          src={rx.image_url}
                          alt="Prescription"
                          className="w-full max-h-72 object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
                            <Eye className="w-5 h-5 text-foreground" />
                          </div>
                        </div>
                      </div>
                      <div className="p-2.5 flex items-center justify-end border-t border-border/30 bg-muted/20">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-8"
                          onClick={() => handleDownload(rx.image_url!, rx.id)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2 text-sm">
                      {rx.diagnosis && (
                        <div>
                          <span className="font-medium text-foreground">Diagnosis: </span>
                          <span className="text-muted-foreground">{rx.diagnosis}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-foreground">Details: </span>
                        <span className="text-muted-foreground">{rx.medications}</span>
                      </div>
                      {rx.instructions && (
                        <div>
                          <span className="font-medium text-foreground">Instructions: </span>
                          <span className="text-muted-foreground">{rx.instructions}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-Size Image Viewer - No print button */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>Prescription</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 mr-6"
                onClick={() => viewingImage && handleDownload(viewingImage, 0)}
              >
                <Download className="h-3 w-3" /> Save
              </Button>
            </DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img src={viewingImage} alt="Prescription" className="w-full object-contain rounded-lg bg-white max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
