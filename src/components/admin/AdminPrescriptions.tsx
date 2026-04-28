import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Pencil, Search } from 'lucide-react';
import { RecordImageGallery } from '@/components/shared/RecordImageGallery';
import { RecordImageEditor } from '@/components/shared/RecordImageEditor';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';

interface PrescriptionRow {
  id: number;
  user_id: string;
  appointment_id: number | null;
  group_member_id: number | null;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  image_url: string | null;
  images?: string[] | null;
  prescribed_by: string;
  prescription_date: string;
  created_at: string;
  patient_name?: string;
  member_name?: string;
}

interface AdminPrescriptionsProps {
  highlightAppointmentId?: number | null;
  highlightKey?: number;
}

export default function AdminPrescriptions({ highlightAppointmentId, highlightKey }: AdminPrescriptionsProps = {}) {
  void highlightAppointmentId; void highlightKey;
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PrescriptionRow | null>(null);

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
      <PageHeader
        icon={FileText}
        title="All Prescriptions"
        description="View and manage every prescription written by the clinic."
        actions={prescriptions.length > 0 ? (
          <Badge variant="outline" className="text-[11px] tabular-nums hidden sm:inline-flex">
            {prescriptions.length} total
          </Badge>
        ) : undefined}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or doctor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading prescriptions...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'No prescriptions match your search' : 'No prescriptions found'}
          description={searchQuery ? 'Try a different keyword.' : 'New prescriptions will appear here as soon as they are added.'}
          tone="muted"
        />
      ) : (
        <Card className="border-border/50 overflow-hidden">
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
                        {(() => {
                          const set = new Set<string>();
                          if (rx.image_url) set.add(rx.image_url);
                          for (const u of rx.images || []) if (u) set.add(u);
                          const total = set.size;
                          if (total === 0) return <Badge variant="secondary" className="text-xs">Text Only</Badge>;
                          return <Badge variant="confirmed" className="text-xs">{total > 1 ? `${total} Images` : 'Has Image'}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <RecordImageGallery primary={rx.image_url} images={rx.images} title="Prescription Images" />
                          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => setEditing(rx)}>
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {editing && (
        <RecordImageEditor
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          kind="prescription"
          recordId={editing.id}
          primary={editing.image_url}
          images={editing.images}
          patientLabel={editing.member_name ? `${editing.patient_name} · ${editing.member_name}` : editing.patient_name}
          onSaved={({ image_url, images }) => {
            setPrescriptions(prev => prev.map(p => p.id === editing.id ? { ...p, image_url, images } : p));
          }}
          onDeleted={() => {
            setPrescriptions(prev => prev.filter(p => p.id !== editing.id));
          }}
        />
      )}
    </div>
  );
}
