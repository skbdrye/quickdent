import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, FileText, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Appointment {
  id: number;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  contact: string | null;
  notes: string | null;
  user_id: string;
  is_group_booking: boolean;
  duration_min: number;
  created_at: string;
}

interface GroupMember {
  id: number;
  member_name: string;
  appointment_time: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  relationship: string | null;
  is_primary: boolean;
}

interface PatientProfile {
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
}

interface MedicalAssessment {
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

interface Prescription {
  id: number;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  prescribed_by: string;
  prescription_date: string;
}

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function AppointmentManagement() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [medicalAssessment, setMedicalAssessment] = useState<MedicalAssessment | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({ medications: '', diagnosis: '', instructions: '', prescribed_by: 'Dr. Admin' });
  const [prescriptionTarget, setPrescriptionTarget] = useState<{ userId: string; appointmentId: number; groupMemberId?: number }>({ userId: '', appointmentId: 0 });

  useEffect(() => {
    loadAppointments();
    const channel = supabase
      .channel('admin-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadAppointments() {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false });
    setAppointments(data || []);
  }

  async function updateStatus(id: number, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id);
    toast({ title: 'Status Updated', description: `Appointment marked as ${status}` });
    loadAppointments();
  }

  async function viewDetails(apt: Appointment) {
    setSelectedAppointment(apt);
    const promises: any[] = [
      supabase.from('patient_profiles').select('*').eq('user_id', apt.user_id).maybeSingle(),
      supabase.from('medical_assessments').select('*').eq('user_id', apt.user_id).maybeSingle(),
      supabase.from('prescriptions').select('*').eq('user_id', apt.user_id).order('prescription_date', { ascending: false }),
    ];

    if (apt.is_group_booking) {
      promises.push(supabase.from('group_members').select('*').eq('appointment_id', apt.id));
    }

    const results = await Promise.all(promises);
    const profileRes = results[0] as { data: PatientProfile | null };
    const medRes = results[1] as { data: MedicalAssessment | null };
    const rxRes = results[2] as { data: Prescription[] | null };

    setPatientProfile(profileRes.data);
    setMedicalAssessment(medRes.data);
    setPrescriptions(rxRes.data || []);

    if (apt.is_group_booking) {
      const gmRes = results[3] as { data: GroupMember[] | null };
      setGroupMembers(gmRes.data || []);
    } else {
      setGroupMembers([]);
    }

    setShowDetails(true);
  }

  async function submitPrescription() {
    if (!prescriptionData.medications.trim()) {
      toast({ title: 'Error', description: 'Medications field is required', variant: 'destructive' });
      return;
    }

    const insertData: any = {
      user_id: prescriptionTarget.userId,
      appointment_id: prescriptionTarget.appointmentId,
      medications: prescriptionData.medications,
      diagnosis: prescriptionData.diagnosis || '',
      instructions: prescriptionData.instructions || '',
      prescribed_by: prescriptionData.prescribed_by,
      prescription_date: new Date().toISOString().split('T')[0],
    };

    if (prescriptionTarget.groupMemberId) {
      insertData.group_member_id = prescriptionTarget.groupMemberId;
    }

    const { error } = await supabase.from('prescriptions').insert(insertData);
    if (error) {
      toast({ title: 'Error', description: 'Failed to save prescription', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: 'Prescription saved successfully' });
    setPrescriptionData({ medications: '', diagnosis: '', instructions: '', prescribed_by: 'Dr. Admin' });
    setShowPrescriptionForm(false);

    if (selectedAppointment) {
      const { data } = await (supabase.from('prescriptions').select('*').eq('user_id', selectedAppointment.user_id).order('prescription_date', { ascending: false }) as any);
      setPrescriptions(data || []);
    }
  }

  function openPrescriptionForm(userId: string, appointmentId: number, groupMemberId?: number) {
    setPrescriptionTarget({ userId, appointmentId, groupMemberId });
    setPrescriptionData({ medications: '', diagnosis: '', instructions: '', prescribed_by: 'Dr. Admin' });
    setShowPrescriptionForm(true);
  }

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = apt.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-2xl font-bold text-foreground">Manage Appointments</h1>
        <p className="text-muted-foreground">View and manage all patient appointments</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="No Show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No appointments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium">{apt.patient_name}</TableCell>
                      <TableCell>{new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                      <TableCell>{apt.appointment_time}</TableCell>
                      <TableCell>
                        {apt.is_group_booking ? (
                          <Badge variant="outline" className="text-xs">Group</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Individual</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(apt.status) as "pending" | "confirmed" | "completed" | "cancelled" | "noshow"}>
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => viewDetails(apt)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {apt.status === 'Pending' && (
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateStatus(apt.id, 'Confirmed')}>
                              Confirm
                            </Button>
                          )}
                          {(apt.status === 'Pending' || apt.status === 'Confirmed') && (
                            <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => updateStatus(apt.id, 'Completed')}>
                              Complete
                            </Button>
                          )}
                          {(apt.status === 'Pending' || apt.status === 'Confirmed') && (
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => updateStatus(apt.id, 'No Show')}>
                              No Show
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Details - {selectedAppointment?.patient_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Appointment Info */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Appointment Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {selectedAppointment && new Date(selectedAppointment.appointment_date + 'T00:00:00').toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Time:</span> {selectedAppointment?.appointment_time}</div>
                <div><span className="text-muted-foreground">Status:</span> {selectedAppointment?.status}</div>
                <div><span className="text-muted-foreground">Type:</span> {selectedAppointment?.is_group_booking ? 'Group Booking' : 'Individual'}</div>
                {selectedAppointment?.contact && <div><span className="text-muted-foreground">Contact:</span> {selectedAppointment.contact}</div>}
                {selectedAppointment?.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {selectedAppointment.notes}</div>}
              </div>
            </div>

            {/* Patient Profile */}
            {patientProfile && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Patient Profile</h3>
                <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-muted-foreground">Name:</span> {patientProfile.first_name} {patientProfile.middle_name || ''} {patientProfile.last_name}</div>
                  <div><span className="text-muted-foreground">Gender:</span> {patientProfile.gender || 'N/A'}</div>
                  {patientProfile.date_of_birth && (
                    <>
                      <div><span className="text-muted-foreground">Date of Birth:</span> {new Date(patientProfile.date_of_birth + 'T00:00:00').toLocaleDateString()}</div>
                      <div><span className="text-muted-foreground">Age:</span> {calculateAge(patientProfile.date_of_birth)}</div>
                    </>
                  )}
                  <div><span className="text-muted-foreground">Phone:</span> {patientProfile.phone || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Address:</span> {patientProfile.address || 'N/A'}</div>
                </div>
              </div>
            )}

            {/* Medical Assessment */}
            {medicalAssessment && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Medical History</h3>
                <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-muted-foreground">Currently taking medications?</span> {medicalAssessment.q1 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Allergies?</span> {medicalAssessment.q2 || 'N/A'} {medicalAssessment.q2_details ? `- ${medicalAssessment.q2_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Medical conditions?</span> {medicalAssessment.q3 || 'N/A'} {medicalAssessment.q3_details ? `- ${medicalAssessment.q3_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Previous surgeries?</span> {medicalAssessment.q4 || 'N/A'} {medicalAssessment.q4_details ? `- ${medicalAssessment.q4_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Pregnant or nursing?</span> {medicalAssessment.q5 || 'N/A'} {medicalAssessment.q5_details ? `- ${medicalAssessment.q5_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Bleeding disorders?</span> {medicalAssessment.q6 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Last dental checkup:</span> {medicalAssessment.last_checkup ? new Date(medicalAssessment.last_checkup + 'T00:00:00').toLocaleDateString() : 'N/A'}</div>
                  {medicalAssessment.other_medical && <div><span className="text-muted-foreground">Other:</span> {medicalAssessment.other_medical}</div>}
                </div>
              </div>
            )}

            {/* Group Members */}
            {selectedAppointment?.is_group_booking && groupMembers.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Group Members</h3>
                <div className="space-y-2">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{member.member_name} {member.is_primary && <Badge variant="outline" className="text-xs ml-1">Primary</Badge>}</span>
                        <span className="text-sm text-muted-foreground">{member.appointment_time}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                        {member.date_of_birth && <div>Age: {calculateAge(member.date_of_birth)}</div>}
                        {member.gender && <div>Gender: {member.gender}</div>}
                        {member.phone && <div>Phone: {member.phone}</div>}
                        {member.relationship && <div>Relationship: {member.relationship}</div>}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => selectedAppointment && openPrescriptionForm(selectedAppointment.user_id, selectedAppointment.id, member.id)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Add Prescription
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prescriptions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Prescriptions</h3>
                {selectedAppointment && !selectedAppointment.is_group_booking && (
                  <Button variant="outline" size="sm" onClick={() => openPrescriptionForm(selectedAppointment.user_id, selectedAppointment.id)}>
                    <FileText className="h-3 w-3 mr-1" />
                    Add Prescription
                  </Button>
                )}
              </div>
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
                      {rx.diagnosis && <div><span className="text-muted-foreground">Diagnosis:</span> {rx.diagnosis}</div>}
                      <div><span className="text-muted-foreground">Medications:</span> {rx.medications}</div>
                      {rx.instructions && <div><span className="text-muted-foreground">Instructions:</span> {rx.instructions}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Form Dialog */}
      <Dialog open={showPrescriptionForm} onOpenChange={setShowPrescriptionForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prescription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prescribed By</Label>
              <Input value={prescriptionData.prescribed_by} onChange={(e) => setPrescriptionData({ ...prescriptionData, prescribed_by: e.target.value })} />
            </div>
            <div>
              <Label>Diagnosis</Label>
              <Input value={prescriptionData.diagnosis} onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
            </div>
            <div>
              <Label>Medications *</Label>
              <Textarea value={prescriptionData.medications} onChange={(e) => setPrescriptionData({ ...prescriptionData, medications: e.target.value })} placeholder="Enter medications" rows={3} />
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea value={prescriptionData.instructions} onChange={(e) => setPrescriptionData({ ...prescriptionData, instructions: e.target.value })} placeholder="Enter instructions" rows={2} />
            </div>
            <Button onClick={submitPrescription} className="w-full">Save Prescription</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
