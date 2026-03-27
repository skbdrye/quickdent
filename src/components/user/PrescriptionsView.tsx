import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { FileText } from 'lucide-react';

interface Prescription {
  id: number;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  prescribed_by: string;
  prescription_date: string;
  group_member_id: number | null;
}

interface GroupMemberPrescription extends Prescription {
  member_name?: string;
}

export default function PrescriptionsView() {
  const { user } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<GroupMemberPrescription[]>([]);

  const loadPrescriptions = useCallback(async () => {
    if (!user) return;

    // Load user's own prescriptions
    const { data: ownRx } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('prescription_date', { ascending: false });

    const allRx: GroupMemberPrescription[] = (ownRx || []).map((rx) => ({ ...rx, member_name: undefined }));

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
          memberRx.forEach((rx) => {
            const member = members.find((m) => m.id === rx.group_member_id);
            allRx.push({ ...rx, member_name: member?.member_name || 'Unknown' });
          });
        }
      }
    }

    setPrescriptions(allRx);
  }, [user]);

  useEffect(() => {
    if (user) loadPrescriptions();
  }, [user, loadPrescriptions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
        <p className="text-muted-foreground">View prescriptions from your dental visits</p>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No prescriptions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your prescriptions will appear here after your dental visits</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{rx.prescribed_by}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  {rx.member_name && (
                    <Badge variant="outline" className="text-xs">
                      For: {rx.member_name}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {rx.diagnosis && (
                    <div>
                      <span className="font-medium text-foreground">Diagnosis: </span>
                      <span className="text-muted-foreground">{rx.diagnosis}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-foreground">Medications: </span>
                    <span className="text-muted-foreground">{rx.medications}</span>
                  </div>
                  {rx.instructions && (
                    <div>
                      <span className="font-medium text-foreground">Instructions: </span>
                      <span className="text-muted-foreground">{rx.instructions}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
