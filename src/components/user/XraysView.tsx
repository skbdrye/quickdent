/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Image, Download, Eye, CalendarDays, Clock, Users, User } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';

interface XrayRecord {
  id: number;
  image_url: string;
  notes: string;
  uploaded_by: string;
  xray_date: string;
  group_member_id: number | null;
  appointment_id: number | null;
}

interface GroupMemberXray extends XrayRecord {
  member_name?: string;
}

interface AppointmentXrayGroup {
  appointment_id: number | null;
  appointment_date: string;
  appointment_time: string;
  is_group_booking: boolean;
  patient_name: string;
  xrays: GroupMemberXray[];
}

export default function XraysView() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<AppointmentXrayGroup[]>([]);
  const [viewingXrays, setViewingXrays] = useState<GroupMemberXray[] | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadXrays = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch own xrays
    const { data: ownXrays } = await (supabase as any)
      .from('xrays')
      .select('*')
      .eq('user_id', user.id)
      .is('group_member_id', null)
      .order('xray_date', { ascending: false });

    const allXrays: GroupMemberXray[] = (ownXrays || []).map((x: Record<string, unknown>) => ({
      ...x,
      member_name: undefined,
    }) as unknown as GroupMemberXray);

    // Fetch group member xrays
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
        const { data: memberXrays } = await (supabase as any)
          .from('xrays')
          .select('*')
          .in('group_member_id', memberIds)
          .order('xray_date', { ascending: false });

        if (memberXrays) {
          memberXrays.forEach((x: Record<string, unknown>) => {
            const member = members.find((m) => m.id === x.group_member_id);
            allXrays.push({
              ...x,
              member_name: member?.member_name || 'Unknown',
            } as unknown as GroupMemberXray);
          });
        }
      }
    }

    // Group by appointment
    const aptIdSet = new Set<number>();
    allXrays.forEach((x) => { if (x.appointment_id) aptIdSet.add(x.appointment_id); });

    const aptMap = new Map<number, { appointment_date: string; appointment_time: string; is_group_booking: boolean; patient_name: string }>();
    if (aptIdSet.size > 0) {
      const { data: apts } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, is_group_booking, patient_name')
        .in('id', Array.from(aptIdSet));
      if (apts) {
        apts.forEach((a) => aptMap.set(a.id, a));
      }
    }

    const groupMap = new Map<number | string, AppointmentXrayGroup>();
    allXrays.forEach((x) => {
      const key = x.appointment_id ?? `no-apt-${x.id}`;
      if (!groupMap.has(key)) {
        const apt = x.appointment_id ? aptMap.get(x.appointment_id) : null;
        groupMap.set(key, {
          appointment_id: x.appointment_id,
          appointment_date: apt?.appointment_date || x.xray_date,
          appointment_time: apt?.appointment_time || '',
          is_group_booking: apt?.is_group_booking || false,
          patient_name: apt?.patient_name || user.username || '',
          xrays: [],
        });
      }
      groupMap.get(key)!.xrays.push(x);
    });

    const sorted = Array.from(groupMap.values()).sort((a, b) =>
      b.appointment_date.localeCompare(a.appointment_date)
    );

    setGroups(sorted);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadXrays();
  }, [user, loadXrays]);

  const handleDownload = async (imageUrl: string, xrayId: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xray_${xrayId}.${blob.type.split('/')[1] || 'jpg'}`;
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
        <h1 className="text-2xl font-bold text-foreground">My X-Rays</h1>
        <p className="text-muted-foreground">View digital copies of your dental x-rays</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-foreground">No x-rays yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your x-ray records will appear here after your dental visits</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group, idx) => (
            <Card
              key={group.appointment_id ?? `group-${idx}`}
              className="border-border/50 overflow-hidden hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                      {group.is_group_booking ? (
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        {group.is_group_booking ? 'Companion Booking' : 'Dental Appointment'}
                      </p>
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
                          {group.xrays.length} x-ray{group.xrays.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 h-9 text-xs"
                    onClick={() => setViewingXrays(group.xrays)}
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

      {/* X-ray List Viewer Dialog */}
      <Dialog open={!!viewingXrays} onOpenChange={() => setViewingXrays(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>X-Ray Records</DialogTitle>
          </DialogHeader>
          {viewingXrays && (
            <div className="space-y-4">
              {viewingXrays.map((xray) => (
                <div key={xray.id} className="border border-border/50 rounded-xl overflow-hidden">
                  <div className="p-3 flex items-center justify-between bg-muted/30 border-b border-border/30">
                    <div>
                      <p className="font-medium text-sm text-foreground">{xray.uploaded_by}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(xray.xray_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                    {xray.member_name && (
                      <Badge variant="outline" className="text-xs">
                        For: {xray.member_name}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <div
                      className="relative cursor-pointer group bg-white"
                      onClick={() => setViewingImage(xray.image_url)}
                    >
                      <img
                        src={xray.image_url}
                        alt="X-Ray"
                        className="w-full max-h-72 object-contain"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
                          <Eye className="w-5 h-5 text-foreground" />
                        </div>
                      </div>
                    </div>
                    {xray.notes && (
                      <div className="px-4 py-2 text-sm text-muted-foreground border-t border-border/30">
                        <span className="font-medium text-foreground">Notes: </span>{xray.notes}
                      </div>
                    )}
                    <div className="p-2.5 flex items-center justify-end border-t border-border/30 bg-muted/20">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => handleDownload(xray.image_url, xray.id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-Size Image Viewer */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>X-Ray</span>
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
            <img src={viewingImage} alt="X-Ray" className="w-full object-contain rounded-lg bg-white max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
