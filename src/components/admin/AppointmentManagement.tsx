import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Search, Filter, Upload, Image as ImageIcon, Loader2, Printer, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  linked_user_id: string | null;
  // Medical fields
  med_q1: string | null;
  med_q2: string | null;
  med_q2_details: string | null;
  med_q3: string | null;
  med_q3_details: string | null;
  med_q4: string | null;
  med_q4_details: string | null;
  med_q5: string | null;
  med_q5_details: string | null;
  med_q6: string | null;
  med_last_checkup: string | null;
  med_other: string | null;
  med_consent: boolean | null;
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
  group_member_id: number | null;
  image_url: string | null;
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
  const [prescriptionTarget, setPrescriptionTarget] = useState<{ userId: string; appointmentId: number; groupMemberId?: number; memberName?: string }>({ userId: '', appointmentId: 0 });
  const [expandedGroupMember, setExpandedGroupMember] = useState<number | null>(null);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prescribedBy, setPrescribedBy] = useState('Dr. Admin');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

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
    setExpandedGroupMember(null);

    if (apt.is_group_booking) {
      // For group bookings: fetch group members + prescriptions only (not the booker's profile)
      const [gmRes, rxRes] = await Promise.all([
        supabase.from('group_members').select('*').eq('appointment_id', apt.id),
        supabase.from('prescriptions').select('*').eq('appointment_id', apt.id).order('prescription_date', { ascending: false }),
      ]);

      setGroupMembers((gmRes.data || []) as unknown as GroupMember[]);
      setPrescriptions((rxRes.data || []) as unknown as Prescription[]);
      // Don't show the booker's profile/assessment for group bookings
      setPatientProfile(null);
      setMedicalAssessment(null);
    } else {
      // For individual bookings: fetch patient profile + medical assessment + prescriptions
      const [profileRes, medRes, rxRes] = await Promise.all([
        supabase.from('patient_profiles').select('*').eq('user_id', apt.user_id).maybeSingle(),
        supabase.from('medical_assessments').select('*').eq('user_id', apt.user_id).maybeSingle(),
        supabase.from('prescriptions').select('*').eq('appointment_id', apt.id).order('prescription_date', { ascending: false }),
      ]);

      setPatientProfile(profileRes.data as PatientProfile | null);
      setMedicalAssessment(medRes.data as MedicalAssessment | null);
      setPrescriptions((rxRes.data || []) as unknown as Prescription[]);
      setGroupMembers([]);
    }

    setShowDetails(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file (JPG, PNG, etc.)', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be under 10MB', variant: 'destructive' });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function submitPrescription() {
    if (!selectedImage) {
      toast({ title: 'Error', description: 'Please select a prescription image to upload', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const insertData: Record<string, unknown> = {
        user_id: prescriptionTarget.userId,
        appointment_id: prescriptionTarget.appointmentId,
        medications: prescriptionTarget.memberName ? `Prescription for ${prescriptionTarget.memberName}` : 'Prescription image uploaded',
        diagnosis: '',
        instructions: '',
        prescribed_by: prescribedBy,
        prescription_date: new Date().toISOString().split('T')[0],
      };

      if (prescriptionTarget.groupMemberId) {
        insertData.group_member_id = prescriptionTarget.groupMemberId;
      }

      const { data: rxData, error: rxError } = await supabase
        .from('prescriptions')
        .insert(insertData)
        .select()
        .single();

      if (rxError || !rxData) {
        throw new Error('Failed to create prescription record');
      }

      toast({ title: 'Success', description: 'Prescription saved successfully' });

      const { data: updatedRx } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('appointment_id', prescriptionTarget.appointmentId)
        .order('prescription_date', { ascending: false });
      setPrescriptions((updatedRx || []) as unknown as Prescription[]);

      setSelectedImage(null);
      setImagePreview(null);
      setPrescribedBy('Dr. Admin');
      setShowPrescriptionForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save prescription', variant: 'destructive' });
    }
    setUploading(false);
  }

  function openPrescriptionForm(userId: string, appointmentId: number, groupMemberId?: number, memberName?: string) {
    setPrescriptionTarget({ userId, appointmentId, groupMemberId, memberName });
    setPrescribedBy('Dr. Admin');
    setSelectedImage(null);
    setImagePreview(null);
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

  // Render medical history for a group member
  function renderMemberMedical(member: GroupMember) {
    const questions = [
      { label: 'Good health?', val: member.med_q1 },
      { label: 'Under medical treatment?', val: member.med_q2, detail: member.med_q2_details },
      { label: 'Maintenance medications?', val: member.med_q3, detail: member.med_q3_details },
      { label: 'Hospitalized before?', val: member.med_q4, detail: member.med_q4_details },
      { label: 'Known allergies?', val: member.med_q5, detail: member.med_q5_details },
      { label: 'Pregnant/nursing?', val: member.med_q6 },
    ];

    const hasMedData = questions.some(q => q.val);

    if (!hasMedData) {
      return <p className="text-xs text-muted-foreground italic">No medical history provided</p>;
    }

    return (
      <div className="space-y-1.5 text-sm">
        {questions.map((q, i) => (
          <div key={i}>
            <span className="text-muted-foreground">{q.label}</span>{' '}
            <span className="text-foreground font-medium">{q.val || 'N/A'}</span>
            {q.detail && <span className="text-muted-foreground"> - {q.detail}</span>}
          </div>
        ))}
        {member.med_last_checkup && (
          <div>
            <span className="text-muted-foreground">Last checkup:</span>{' '}
            <span className="text-foreground">{new Date(member.med_last_checkup + 'T00:00:00').toLocaleDateString()}</span>
          </div>
        )}
        {member.med_other && (
          <div>
            <span className="text-muted-foreground">Other:</span>{' '}
            <span className="text-foreground">{member.med_other}</span>
          </div>
        )}
      </div>
    );
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
            <DialogTitle>
              {selectedAppointment?.is_group_booking
                ? `Group Booking - Booked by ${selectedAppointment?.patient_name}`
                : `Patient Details - ${selectedAppointment?.patient_name}`}
            </DialogTitle>
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

            {/* Individual booking: Show patient profile & medical assessment */}
            {!selectedAppointment?.is_group_booking && patientProfile && (
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

            {!selectedAppointment?.is_group_booking && medicalAssessment && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Medical History</h3>
                <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-muted-foreground">Good health?</span> {medicalAssessment.q1 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Under medical treatment?</span> {medicalAssessment.q2 || 'N/A'} {medicalAssessment.q2_details ? `- ${medicalAssessment.q2_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Maintenance medications?</span> {medicalAssessment.q3 || 'N/A'} {medicalAssessment.q3_details ? `- ${medicalAssessment.q3_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Hospitalized before?</span> {medicalAssessment.q4 || 'N/A'} {medicalAssessment.q4_details ? `- ${medicalAssessment.q4_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Known allergies?</span> {medicalAssessment.q5 || 'N/A'} {medicalAssessment.q5_details ? `- ${medicalAssessment.q5_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Pregnant/nursing?</span> {medicalAssessment.q6 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Last checkup:</span> {medicalAssessment.last_checkup ? new Date(medicalAssessment.last_checkup + 'T00:00:00').toLocaleDateString() : 'N/A'}</div>
                  {medicalAssessment.other_medical && <div><span className="text-muted-foreground">Other:</span> {medicalAssessment.other_medical}</div>}
                </div>
              </div>
            )}

            {/* Group Members with expandable medical history */}
            {selectedAppointment?.is_group_booking && groupMembers.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Group Members ({groupMembers.length})</h3>
                <div className="space-y-2">
                  {groupMembers.map((member) => {
                    const isExpanded = expandedGroupMember === member.id;
                    return (
                      <div key={member.id} className="bg-muted/50 rounded-lg overflow-hidden border border-border/30">
                        {/* Member header - clickable to expand */}
                        <button
                          className="w-full p-3 flex items-center justify-between hover:bg-muted/80 transition-colors"
                          onClick={() => setExpandedGroupMember(isExpanded ? null : member.id)}
                        >
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{member.member_name}</span>
                              {member.is_primary && <Badge variant="outline" className="text-[10px]">Primary</Badge>}
                              {member.relationship && <span className="text-xs text-muted-foreground">({member.relationship})</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>Time: {member.appointment_time}</span>
                              {member.date_of_birth && <span>Age: {calculateAge(member.date_of_birth)}</span>}
                              {member.gender && <span>{member.gender}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-border/30 space-y-3">
                            {/* Personal info */}
                            <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                              {member.date_of_birth && (
                                <div><span className="text-muted-foreground">DOB:</span> {new Date(member.date_of_birth + 'T00:00:00').toLocaleDateString()}</div>
                              )}
                              {member.phone && <div><span className="text-muted-foreground">Phone:</span> {member.phone}</div>}
                            </div>

                            {/* Medical History */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Medical History</p>
                              {renderMemberMedical(member)}
                            </div>

                            {/* Upload prescription button */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => selectedAppointment && openPrescriptionForm(selectedAppointment.user_id, selectedAppointment.id, member.id, member.member_name)}
                            >
                              <Upload className="h-3 w-3" />
                              Upload Prescription
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prescriptions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Prescriptions</h3>
                {selectedAppointment && !selectedAppointment.is_group_booking && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openPrescriptionForm(selectedAppointment.user_id, selectedAppointment.id, undefined, selectedAppointment.patient_name)}>
                    <Upload className="h-3 w-3" />
                    Upload Prescription
                  </Button>
                )}
              </div>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions yet</p>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((rx) => {
                    const memberName = rx.group_member_id
                      ? groupMembers.find(m => m.id === rx.group_member_id)?.member_name
                      : undefined;
                    return (
                      <div key={rx.id} className="bg-muted/50 p-3 rounded-lg text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-foreground">{rx.prescribed_by}</span>
                            {memberName && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (For: {memberName})
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-xs">{new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString()}</span>
                        </div>
                        {rx.image_url && (
                          <div
                            className="mt-2 cursor-pointer rounded-lg overflow-hidden border border-border/50 hover:border-secondary/50 transition-colors"
                            onClick={() => setViewingImage(rx.image_url)}
                          >
                            <img src={rx.image_url} alt="Prescription" className="w-full max-h-48 object-contain bg-card" />
                            <div className="text-center py-1 text-xs text-muted-foreground bg-muted/30">
                              Click to view full size
                            </div>
                          </div>
                        )}
                        {!rx.image_url && rx.medications && (
                          <div><span className="text-muted-foreground">Note:</span> {rx.medications}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Upload Dialog */}
      <Dialog open={showPrescriptionForm} onOpenChange={setShowPrescriptionForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Prescription Image
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {prescriptionTarget.memberName && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Patient:</span>{' '}
                <span className="font-medium text-foreground">{prescriptionTarget.memberName}</span>
              </div>
            )}

            <div>
              <Label>Prescribed By</Label>
              <Input value={prescribedBy} onChange={(e) => setPrescribedBy(e.target.value)} placeholder="Doctor name" />
            </div>

            <div>
              <Label>Prescription Image *</Label>
              <p className="text-xs text-muted-foreground mb-2">Upload a photo or scan of the hard copy prescription (RX)</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {!imagePreview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-secondary/50 transition-colors group"
                >
                  <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2 group-hover:text-secondary transition-colors" />
                  <p className="text-sm font-medium text-foreground">Click to select image</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 10MB</p>
                </button>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain bg-card" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => fileInputRef.current?.click()}
                      title="Replace image"
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={submitPrescription} className="w-full gap-2" disabled={uploading || !selectedImage}>
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4" /> Upload Prescription</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    const w = window.open(viewingImage, '_blank');
                    if (w) {
                      w.onload = () => { w.print(); };
                    }
                  }
                }}
              >
                <Printer className="h-3 w-3" /> Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img src={viewingImage} alt="Prescription" className="w-full object-contain rounded-lg bg-card max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
