import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { FileText, Download, Printer, ZoomIn } from 'lucide-react';

interface Prescription {
  id: number;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  image_url: string | null;
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
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async () => {
    if (!user) return;

    // Load user's own prescriptions
    const { data: ownRx } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('prescription_date', { ascending: false });

    const allRx: GroupMemberPrescription[] = (ownRx || []).map((rx: any) => ({ ...rx, member_name: undefined }));

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
          memberRx.forEach((rx: any) => {
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

  const handlePrint = (imageUrl: string) => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html><head><title>Print Prescription</title>
        <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;}
        img{max-width:100%;max-height:100vh;object-fit:contain;}
        @media print{body{margin:0;}img{max-width:100%;max-height:100%;}}
        </style></head><body>
        <img src="${imageUrl}" onload="window.print();window.close();" />
        </body></html>
      `);
      w.document.close();
    }
  };

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
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
        <p className="text-muted-foreground">View and download prescriptions from your dental visits</p>
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
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <Card key={rx.id} className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b border-border/30">
                  <div>
                    <p className="font-medium text-foreground">{rx.prescribed_by}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rx.member_name && (
                      <Badge variant="outline" className="text-xs">
                        For: {rx.member_name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Image */}
                {rx.image_url ? (
                  <div>
                    <div
                      className="relative cursor-pointer group bg-white"
                      onClick={() => setViewingImage(rx.image_url)}
                    >
                      <img
                        src={rx.image_url}
                        alt="Prescription"
                        className="w-full max-h-80 object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
                          <ZoomIn className="w-5 h-5 text-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-3 flex items-center gap-2 border-t border-border/30 bg-muted/30">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 flex-1"
                        onClick={() => handleDownload(rx.image_url!, rx.id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 flex-1"
                        onClick={() => handlePrint(rx.image_url!)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Image Viewer */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>Prescription</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => viewingImage && handleDownload(viewingImage, 0)}
                >
                  <Download className="h-3 w-3" /> Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => viewingImage && handlePrint(viewingImage)}
                >
                  <Printer className="h-3 w-3" /> Print
                </Button>
              </div>
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
