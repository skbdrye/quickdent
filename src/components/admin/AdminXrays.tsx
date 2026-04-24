/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Image, Pencil, Search } from 'lucide-react';
import { RecordImageGallery } from '@/components/shared/RecordImageGallery';
import { RecordImageEditor } from '@/components/shared/RecordImageEditor';

interface XrayRow {
  id: number;
  user_id: string;
  appointment_id: number | null;
  group_member_id: number | null;
  image_url: string;
  images?: string[] | null;
  notes: string;
  uploaded_by: string;
  xray_date: string;
  created_at: string;
  patient_name?: string;
  member_name?: string;
}

interface AdminXraysProps {
  highlightAppointmentId?: number | null;
  highlightKey?: number;
}

export default function AdminXrays({ highlightAppointmentId, highlightKey }: AdminXraysProps = {}) {
  void highlightAppointmentId; void highlightKey;
  const { toast } = useToast();
  const [xrays, setXrays] = useState<XrayRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<XrayRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadXrays();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadXrays() {
    setLoading(true);
    try {
      const { data: xrayData } = await (supabase as any)
        .from('xrays')
        .select('*')
        .order('created_at', { ascending: false });

      if (!xrayData) {
        setXrays([]);
        setLoading(false);
        return;
      }

      // Enrich with patient names
      const userIds = [...new Set(xrayData.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from('patient_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds as string[]);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
      );

      // Get group member names
      const memberIds = xrayData.filter((r: any) => r.group_member_id).map((r: any) => r.group_member_id!);
      let memberMap = new Map<number, string>();
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from('group_members')
          .select('id, member_name')
          .in('id', memberIds);
        memberMap = new Map((members || []).map(m => [m.id, m.member_name]));
      }

      const enriched: XrayRow[] = xrayData.map((xr: any) => ({
        ...xr,
        patient_name: profileMap.get(xr.user_id) || 'Unknown',
        member_name: xr.group_member_id ? memberMap.get(xr.group_member_id) : undefined,
      }));

      setXrays(enriched);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load x-rays', variant: 'destructive' });
    }
    setLoading(false);
  }

  const handleSavedFromEditor = (next: { image_url: string | null; images: string[] }) => {
    if (!editing) return;
    setXrays(prev => prev.map(x => x.id === editing.id ? { ...x, image_url: next.image_url || '', images: next.images } : x));
  };

  const handleDeletedFromEditor = () => {
    if (!editing) return;
    setXrays(prev => prev.filter(x => x.id !== editing.id));
  };

  const filtered = xrays.filter(xr => {
    const q = searchQuery.toLowerCase();
    return (
      (xr.patient_name || '').toLowerCase().includes(q) ||
      (xr.member_name || '').toLowerCase().includes(q) ||
      xr.uploaded_by.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All X-Rays</h1>
        <p className="text-muted-foreground">View and manage patient x-ray records</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or uploaded by..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading x-rays...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No x-rays match your search' : 'No x-ray records found'}
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
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((xr) => (
                    <TableRow key={xr.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{xr.patient_name}</span>
                          {xr.member_name && (
                            <div className="text-xs text-muted-foreground">
                              Member: {xr.member_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{xr.uploaded_by}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(xr.xray_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">{xr.notes || 'No notes'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <RecordImageGallery primary={xr.image_url} images={xr.images} title="X-Ray Images" />
                          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => setEditing(xr)}>
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

      {/* Edit / delete dialog */}
      {editing && (
        <RecordImageEditor
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          kind="xray"
          recordId={editing.id}
          primary={editing.image_url}
          images={editing.images}
          patientLabel={editing.member_name ? `${editing.patient_name} · ${editing.member_name}` : editing.patient_name}
          onSaved={handleSavedFromEditor}
          onDeleted={handleDeletedFromEditor}
        />
      )}
    </div>
  );
}
