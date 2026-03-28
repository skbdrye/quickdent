import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Eye, Printer, ZoomIn } from 'lucide-react';

interface PrescriptionRow {
  id: number;
  user_id: string;
  appointment_id: number | null;
  group_member_id: number | null;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  image_url: string | null;
  prescribed_by: string;
  prescription_date: string;
  created_at: string;
  patient_name?: string;
  member_name?: string;
}

export default function AdminPrescriptions() {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescriptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPrescriptions() {
    setLoading(true);
    try {
      const { data: rxData } = await supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!rxData) {
        setPrescriptions([]);
        setLoading(false);
        return;
      }

      // Enrich with patient names
      const userIds = [...new Set(rxData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('patient_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
      );

      // Get group member names
      const memberIds = rxData.filter(r => r.group_member_id).map(r => r.group_member_id!);
      let memberMap = new Map<number, string>();
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from('group_members')
          .select('id, member_name')
          .in('id', memberIds);
        memberMap = new Map((members || []).map(m => [m.id, m.member_name]));
      }

      const enriched: PrescriptionRow[] = rxData.map(rx => ({
        ...rx,
        patient_name: profileMap.get(rx.user_id) || 'Unknown',
        member_name: rx.group_member_id ? memberMap.get(rx.group_member_id) : undefined,
      }));

      setPrescriptions(enriched);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load prescriptions', variant: 'destructive' });
    }
    setLoading(false);
  }

  const filtered = prescriptions.filter(rx => {
    const q = searchQuery.toLowerCase();
    return (
      (rx.patient_name || '').toLowerCase().includes(q) ||
      (rx.member_name || '').toLowerCase().includes(q) ||
      rx.prescribed_by.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Prescriptions</h1>
        <p className="text-muted-foreground">View and manage all patient prescriptions</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or doctor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading prescriptions...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No prescriptions match your search' : 'No prescriptions found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((rx) => (
                    <TableRow key={rx.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{rx.patient_name}</span>
                          {rx.member_name && (
                            <div className="text-xs text-muted-foreground">
                              Member: {rx.member_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{rx.prescribed_by}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        {rx.group_member_id ? (
                          <Badge variant="outline" className="text-xs">Group</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Individual</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {rx.image_url ? (
                          <Badge variant="confirmed" className="text-xs">Has Image</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Text Only</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {rx.image_url ? (
                          <Button variant="ghost" size="sm" onClick={() => setViewingImage(rx.image_url)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Image Viewer */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>Prescription Image</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  if (viewingImage) {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(`
                        <html><head><title>Print Prescription</title>
                        <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;}
                        img{max-width:100%;max-height:100vh;object-fit:contain;}
                        </style></head><body>
                        <img src="${viewingImage}" onload="window.print();window.close();" />
                        </body></html>
                      `);
                      w.document.close();
                    }
                  }
                }}
              >
                <Printer className="h-3 w-3" /> Print
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
