import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList, Search, ShieldBan, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { banAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { SuccessModal } from '@/components/shared/SuccessModal';

interface PatientProfileData {
  id: number;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  is_complete: boolean;
}

interface MedicalData {
  q1: string | null;
  q2: string | null;
  q2_details: string | null;
  q3: string | null;
  q3_details: string | null;
  q4: string | null;
  q4_details: string | null;
  q5: string | null;
  q5_details: string | null;
  q6: string | null;
  last_checkup: string | null;
  other_medical: string | null;
}

interface PrescriptionData {
  id: number;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  image_url: string | null;
  prescribed_by: string;
  prescription_date: string;
}

interface UserBanData {
  is_banned: boolean;
  no_show_count: number;
}

// Unregistered patients from group bookings
interface GroupMemberPatient {
  id: number;
  member_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  type: 'group_member';
}

type PatientRow = (PatientProfileData & { type: 'registered'; banData?: UserBanData }) | GroupMemberPatient;

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function PatientList() {
  const { toast } = useToast();
  const [registeredPatients, setRegisteredPatients] = useState<(PatientProfileData & { type: 'registered'; banData?: UserBanData })[]>([]);
  const [groupMemberPatients, setGroupMemberPatients] = useState<GroupMemberPatient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientProfileData | null>(null);
  const [medicalData, setMedicalData] = useState<MedicalData | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [banAction, setBanAction] = useState<{ userId: string; action: 'ban' | 'unban'; name: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    // Load registered patients
    const { data: profiles } = await supabase
      .from('patient_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const registered = (profiles || []) as PatientProfileData[];

    // Load ban status for registered patients
    const userIds = registered.map(p => p.user_id);
    const { data: userData } = userIds.length > 0
      ? await supabase.from('users').select('id, is_banned, no_show_count').in('id', userIds)
      : { data: [] };

    const banMap = new Map((userData || []).map(u => [u.id, { is_banned: u.is_banned || false, no_show_count: u.no_show_count || 0 }]));

    setRegisteredPatients(registered.map(p => ({
      ...p,
      type: 'registered' as const,
      banData: banMap.get(p.user_id),
    })));

    // Load unregistered group members (those without linked_user_id)
    const { data: unlinkedMembers } = await supabase
      .from('group_members')
      .select('id, member_name, date_of_birth, gender, phone')
      .is('linked_user_id', null);

    // Deduplicate by name+dob+gender
    const seen = new Set<string>();
    const unique: GroupMemberPatient[] = [];
    (unlinkedMembers || []).forEach(m => {
      const key = `${m.member_name}-${m.date_of_birth}-${m.gender}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({ ...m, type: 'group_member' });
      }
    });
    setGroupMemberPatients(unique);
  }

  async function viewPatient(patient: PatientProfileData) {
    setSelectedPatient(patient);
    const [medRes, rxRes] = await Promise.all([
      supabase.from('medical_assessments').select('*').eq('user_id', patient.user_id).maybeSingle(),
      supabase.from('prescriptions').select('*').eq('user_id', patient.user_id).order('prescription_date', { ascending: false }),
    ]);
    setMedicalData(medRes.data);
    setPrescriptions(rxRes.data || []);
    setShowDetails(true);
  }

  async function handleBanAction() {
    if (!banAction) return;
    try {
      if (banAction.action === 'ban') {
        await banAPI.banUser(banAction.userId);
        setSuccessModal({ open: true, title: 'User Banned', description: `${banAction.name} has been banned from the system.` });
      } else {
        await banAPI.unbanUser(banAction.userId);
        setSuccessModal({ open: true, title: 'User Unbanned', description: `${banAction.name} has been unbanned.` });
      }
      loadPatients();
    } catch {
      toast({ title: 'Error', description: 'Failed to update ban status', variant: 'destructive' });
    }
    setBanAction(null);
  }

  const allPatients: PatientRow[] = [
    ...registeredPatients,
    ...groupMemberPatients,
  ];

  const filtered = allPatients.filter((p) => {
    if (p.type === 'registered') {
      const name = `${p.first_name || ''} ${p.middle_name || ''} ${p.last_name || ''}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    }
    return p.member_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patients</h1>
        <p className="text-muted-foreground">View all patients including unregistered companions</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search patients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No patients found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((patient, i) => {
                    if (patient.type === 'registered') {
                      return (
                        <TableRow key={`reg-${patient.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {patient.first_name} {patient.middle_name || ''} {patient.last_name}
                              {patient.banData?.is_banned && (
                                <Badge variant="destructive" className="text-[10px]">Banned</Badge>
                              )}
                              {patient.banData && patient.banData.no_show_count >= 2 && !patient.banData.is_banned && (
                                <Badge variant="secondary" className="text-[10px] gap-0.5">
                                  <AlertTriangle className="w-3 h-3" /> {patient.banData.no_show_count} no-shows
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{patient.date_of_birth ? new Date(patient.date_of_birth + 'T00:00:00').toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>{patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'N/A'}</TableCell>
                          <TableCell>{patient.gender || 'N/A'}</TableCell>
                          <TableCell>{patient.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={patient.is_complete ? 'confirmed' : 'pending'}>
                              {patient.is_complete ? 'Complete' : 'Incomplete'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" onClick={() => viewPatient(patient)} className="gap-1.5 h-8 text-xs">
                                <ClipboardList className="h-3.5 w-3.5" /> View
                              </Button>
                              {patient.banData?.is_banned ? (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50" onClick={() => setBanAction({ userId: patient.user_id, action: 'unban', name: `${patient.first_name} ${patient.last_name}` })} title="Unban user">
                                  <ShieldCheck className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" onClick={() => setBanAction({ userId: patient.user_id, action: 'ban', name: `${patient.first_name} ${patient.last_name}` })} title="Ban user">
                                  <ShieldBan className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    // Group member (unregistered)
                    return (
                      <TableRow key={`gm-${patient.id}-${i}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {patient.member_name}
                            <Badge variant="outline" className="text-[10px]">Unregistered</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{patient.date_of_birth ? new Date(patient.date_of_birth + 'T00:00:00').toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'N/A'}</TableCell>
                        <TableCell>{patient.gender || 'N/A'}</TableCell>
                        <TableCell>{patient.phone || 'N/A'}</TableCell>
                        <TableCell><Badge variant="outline">Companion</Badge></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">--</span></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>{selectedPatient?.first_name} {selectedPatient?.middle_name || ''} {selectedPatient?.last_name}</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => setShowDetails(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Personal Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                {selectedPatient?.date_of_birth && (
                  <>
                    <div><span className="text-muted-foreground">Date of Birth:</span> {new Date(selectedPatient.date_of_birth + 'T00:00:00').toLocaleDateString()}</div>
                    <div><span className="text-muted-foreground">Age:</span> {calculateAge(selectedPatient.date_of_birth)}</div>
                  </>
                )}
                <div><span className="text-muted-foreground">Gender:</span> {selectedPatient?.gender || 'N/A'}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedPatient?.phone || 'N/A'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selectedPatient?.address || 'N/A'}</div>
              </div>
            </div>

            {medicalData && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Medical History</h3>
                <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-muted-foreground">Good health?</span> {medicalData.q1 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Under treatment?</span> {medicalData.q2 || 'N/A'} {medicalData.q2_details ? `- ${medicalData.q2_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Medications?</span> {medicalData.q3 || 'N/A'} {medicalData.q3_details ? `- ${medicalData.q3_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Hospitalized?</span> {medicalData.q4 || 'N/A'} {medicalData.q4_details ? `- ${medicalData.q4_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Allergies?</span> {medicalData.q5 || 'N/A'} {medicalData.q5_details ? `- ${medicalData.q5_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Pregnant/nursing?</span> {medicalData.q6 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Last checkup:</span> {medicalData.last_checkup ? new Date(medicalData.last_checkup + 'T00:00:00').toLocaleDateString() : 'N/A'}</div>
                  {medicalData.other_medical && <div><span className="text-muted-foreground">Other:</span> {medicalData.other_medical}</div>}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-foreground mb-2">Prescriptions</h3>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions yet</p>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="bg-muted/50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-foreground">{rx.prescribed_by}</span>
                        <span className="text-muted-foreground">{new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString()}</span>
                      </div>
                      {rx.image_url ? (
                        <a href={rx.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-lg overflow-hidden border border-border/50 hover:border-secondary/50 transition-colors">
                          <img src={rx.image_url} alt="Prescription" className="w-full max-h-48 object-contain bg-white" />
                          <div className="text-center py-1 text-xs text-secondary bg-muted/30">Click to view full size</div>
                        </a>
                      ) : (
                        <>
                          {rx.diagnosis && <div><span className="text-muted-foreground">Diagnosis:</span> {rx.diagnosis}</div>}
                          <div><span className="text-muted-foreground">Medications:</span> {rx.medications}</div>
                          {rx.instructions && <div><span className="text-muted-foreground">Instructions:</span> {rx.instructions}</div>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban Confirmation */}
      <AlertDialog open={!!banAction} onOpenChange={() => setBanAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{banAction?.action === 'ban' ? 'Ban User?' : 'Unban User?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {banAction?.action === 'ban'
                ? `Are you sure you want to ban ${banAction.name}? They will not be able to log in or book appointments.`
                : `Are you sure you want to unban ${banAction?.name}? Their no-show count will be reset to 0.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanAction} className={banAction?.action === 'ban' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              {banAction?.action === 'ban' ? 'Ban User' : 'Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        description={successModal.description}
        onClose={() => setSuccessModal({ open: false, title: '', description: '' })}
      />
    </div>
  );
}
