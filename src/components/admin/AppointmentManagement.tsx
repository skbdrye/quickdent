import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Filter, Upload, Image as ImageIcon, Loader2, Download, X, ChevronDown, ChevronUp, RotateCcw, Check, XCircle, AlertTriangle, ClipboardList, CheckCircle2, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { appointmentsAPI, notificationsAPI, servicesAPI } from '@/lib/api';
import { useClinicStore } from '@/lib/store';
import { RescheduleDialog } from '@/components/shared/RescheduleDialog';
import { SuccessModal } from '@/components/shared/SuccessModal';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  reschedule_count?: number;
  service?: string | null;
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

export default function AppointmentManagement({ highlightAppointmentId, highlightKey }: { highlightAppointmentId?: number | null; highlightKey?: number }) {
  const { toast } = useToast();
  const { services, fetchServices } = useClinicStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [memberMap, setMemberMap] = useState<Map<number, GroupMember[]>>(new Map());
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
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [adminCancelId, setAdminCancelId] = useState<number | null>(null);
  const [adminCancelReason, setAdminCancelReason] = useState('');
  const [highlightingId, setHighlightingId] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prescribedBy, setPrescribedBy] = useState('Dr. Admin');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const loadAppointments = useCallback(async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: false });
    const apts = (data || []) as Appointment[];
    setAppointments(apts);

    // Preload group member names for display in table
    const groupApts = apts.filter(a => a.is_group_booking);
    if (groupApts.length > 0) {
      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .in('appointment_id', groupApts.map(a => a.id));
      const map = new Map<number, GroupMember[]>();
      (members || []).forEach((m: GroupMember) => {
        const existing = map.get(m.appointment_time as unknown as number) || [];
        // Use appointment_id as key
        const aptId = (m as unknown as { appointment_id: number }).appointment_id;
        const arr = map.get(aptId) || [];
        arr.push(m as unknown as GroupMember);
        map.set(aptId, arr);
      });
      // Re-map properly
      const properMap = new Map<number, GroupMember[]>();
      (members || []).forEach((m: unknown) => {
        const member = m as GroupMember & { appointment_id: number };
        const arr = properMap.get(member.appointment_id) || [];
        arr.push(member);
        properMap.set(member.appointment_id, arr);
      });
      setMemberMap(properMap);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    const channel = supabase
      .channel('admin-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => loadAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAppointments]);

  // Scroll to & highlight appointment with proper re-trigger support
  useEffect(() => {
    if (highlightAppointmentId && appointments.length > 0) {
      setHighlightingId(highlightAppointmentId);
      setTimeout(() => {
        const el = document.getElementById(`admin-apt-${highlightAppointmentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      const timer = setTimeout(() => {
        setHighlightingId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightAppointmentId, highlightKey, appointments]);

  async function updateStatus(id: number, status: string) {
    await appointmentsAPI.updateStatus(id, status as 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show');

    // Send notifications to user
    const apt = appointments.find(a => a.id === id);
    if (apt) {
      await notificationsAPI.create({
        user_id: apt.user_id,
        title: `Appointment ${status}`,
        message: `Your appointment on ${apt.appointment_date} at ${apt.appointment_time} has been marked as ${status}.`,
        type: status === 'Confirmed' ? 'reminder' : status === 'No Show' ? 'no_show_warning' : 'status_change',
        related_appointment_id: id,
      });
    }

    toast({ title: 'Status Updated', description: `Appointment marked as ${status}` });
    setSuccessModal({ open: true, title: 'Status Updated', description: `Appointment has been marked as ${status}.` });
    loadAppointments();
  }

  const handleAdminReschedule = async (newDate: string, newTime: string) => {
    if (!rescheduleId) return;
    try {
      await appointmentsAPI.reschedule(rescheduleId, newDate, newTime, true);
      const apt = appointments.find(a => a.id === rescheduleId);
      if (apt) {
        await notificationsAPI.create({
          user_id: apt.user_id,
          title: 'Appointment Rescheduled',
          message: `Your appointment has been rescheduled to ${newDate} at ${newTime} by the clinic.`,
          type: 'reschedule',
          related_appointment_id: rescheduleId,
        });
      }
      toast({ title: 'Rescheduled', description: `Appointment moved to ${newDate} at ${newTime}.` });
      setSuccessModal({ open: true, title: 'Appointment Rescheduled', description: `Appointment has been moved to ${newDate} at ${newTime}.` });
      loadAppointments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      throw err;
    }
  };

  async function viewDetails(apt: Appointment) {
    setSelectedAppointment(apt);
    setExpandedGroupMember(null);

    if (apt.is_group_booking) {
      const [gmRes, rxRes] = await Promise.all([
        supabase.from('group_members').select('*').eq('appointment_id', apt.id),
        supabase.from('prescriptions').select('*').eq('appointment_id', apt.id).order('prescription_date', { ascending: false }),
      ]);
      setGroupMembers((gmRes.data || []) as unknown as GroupMember[]);
      setPrescriptions((rxRes.data || []) as unknown as Prescription[]);
      setPatientProfile(null);
      setMedicalAssessment(null);
    } else {
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
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'Please select a prescription image', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      // 1. Upload image to Supabase storage first
      const ext = selectedImage.name.split('.').pop() || 'jpg';
      const fileName = `prescription_${prescriptionTarget.appointmentId}_${Date.now()}.${ext}`;
      const filePath = `prescriptions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(filePath, selectedImage, { upsert: true });

      let imageUrl: string | null = null;
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('prescriptions')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      // 2. Create prescription record with image_url
      const insertData = {
        user_id: prescriptionTarget.userId,
        appointment_id: prescriptionTarget.appointmentId,
        medications: prescriptionTarget.memberName ? `Prescription for ${prescriptionTarget.memberName}` : 'Prescription image uploaded',
        diagnosis: '',
        instructions: '',
        prescribed_by: prescribedBy,
        prescription_date: new Date().toISOString().split('T')[0],
        image_url: imageUrl,
        ...(prescriptionTarget.groupMemberId && { group_member_id: prescriptionTarget.groupMemberId }),
      };

      const { error: rxError } = await supabase.from('prescriptions').insert(insertData).select().single();
      if (rxError) throw new Error('Failed to create prescription record');

      // Notify the patient about the new prescription
      await notificationsAPI.create({
        user_id: prescriptionTarget.userId,
        title: 'New Prescription Available',
        message: `A prescription has been uploaded${prescriptionTarget.memberName ? ` for ${prescriptionTarget.memberName}` : ''}. View it in your Prescriptions tab.`,
        type: 'prescription',
        related_appointment_id: prescriptionTarget.appointmentId,
      });

      toast({ title: 'Success', description: 'Prescription saved successfully' });
      setSuccessModal({ open: true, title: 'Prescription Uploaded', description: 'The prescription has been saved and the patient has been notified.' });

      const { data: updatedRx } = await supabase.from('prescriptions').select('*').eq('appointment_id', prescriptionTarget.appointmentId).order('prescription_date', { ascending: false });
      setPrescriptions((updatedRx || []) as unknown as Prescription[]);
      setSelectedImage(null);
      setImagePreview(null);
      setPrescribedBy('Dr. Admin');
      setShowPrescriptionForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
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

  // Get display name for appointment - show group member names for group bookings
  function getDisplayName(apt: Appointment): string {
    if (apt.is_group_booking) {
      const members = memberMap.get(apt.id);
      if (members && members.length > 0) {
        const names = members.map(m => m.member_name);
        if (names.length === 1) return names[0];
        if (names.length <= 2) return names.join(' & ');
        return `${names[0]} +${names.length - 1} more`;
      }
    }
    return apt.patient_name;
  }

  // Get booking type label
  function getBookingTypeLabel(apt: Appointment): string {
    if (!apt.is_group_booking) return 'Individual';
    const members = memberMap.get(apt.id);
    if (members && members.length === 1) return 'Companion';
    return `Group (${members?.length || 0})`;
  }

  const statusOrder: Record<string, number> = { 'Pending': 0, 'Confirmed': 1, 'Completed': 2, 'Cancelled': 3, 'No Show': 4 };

  const filteredAppointments = appointments.filter((apt) => {
    const displayName = getDisplayName(apt);
    const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          apt.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

  function getStatusVariant(status: string) {
    switch (status) {
      case 'Confirmed': return 'confirmed';
      case 'Completed': return 'completed';
      case 'Cancelled': return 'cancelled';
      case 'No Show': return 'noshow';
      default: return 'pending';
    }
  }

  function renderMemberMedical(member: GroupMember) {
    const questions = [
      { label: 'Good health?', val: member.med_q1 },
      { label: 'Under treatment?', val: member.med_q2, detail: member.med_q2_details },
      { label: 'Medications?', val: member.med_q3, detail: member.med_q3_details },
      { label: 'Hospitalized?', val: member.med_q4, detail: member.med_q4_details },
      { label: 'Allergies?', val: member.med_q5, detail: member.med_q5_details },
      { label: 'Pregnant/nursing?', val: member.med_q6 },
    ];
    const hasMedData = questions.some(q => q.val);
    if (!hasMedData) return <p className="text-xs text-muted-foreground italic">No medical history provided</p>;
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
          <div><span className="text-muted-foreground">Last checkup:</span> <span className="text-foreground">{new Date(member.med_last_checkup + 'T00:00:00').toLocaleDateString()}</span></div>
        )}
        {member.med_other && (
          <div><span className="text-muted-foreground">Other:</span> <span className="text-foreground">{member.med_other}</span></div>
        )}
      </div>
    );
  }

  const rescheduleApt = rescheduleId ? appointments.find(a => a.id === rescheduleId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manage Appointments</h1>
        <p className="text-muted-foreground">View and manage all patient appointments</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by patient name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No appointments found</TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((apt) => {
                    const isDue = new Date() >= new Date(`${apt.appointment_date}T${apt.appointment_time}`);
                    return (
                    <TableRow key={apt.id} id={`admin-apt-${apt.id}`} className={cn('transition-all duration-500', highlightingId === apt.id && 'bg-secondary/10 ring-2 ring-secondary/30 ring-inset')}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getDisplayName(apt)}</p>
                          {apt.is_group_booking && (
                            <p className="text-[11px] text-muted-foreground">Booked by {apt.patient_name}</p>
                          )}
                          {apt.service && apt.status === 'Confirmed' && (
                            <p className="text-[11px] text-secondary font-medium">Service: {apt.service}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                      <TableCell>{apt.appointment_time}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{getBookingTypeLabel(apt)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(apt.status) as "pending" | "confirmed" | "completed" | "cancelled" | "noshow"}>{apt.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => viewDetails(apt)} className="gap-1.5 h-8 text-xs">
                            <ClipboardList className="h-3.5 w-3.5" /> View
                          </Button>
                          {apt.status === 'Pending' && (
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300" onClick={() => updateStatus(apt.id, 'Confirmed')}>
                              <Check className="h-3.5 w-3.5" /> Confirm
                            </Button>
                          )}
                          {apt.status === 'Confirmed' && (
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50 hover:border-violet-300" onClick={() => updateStatus(apt.id, 'Completed')}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                            </Button>
                          )}
                          {(apt.status === 'Pending' || apt.status === 'Confirmed') && (
                            <>
                              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300" onClick={() => setRescheduleId(apt.id)}>
                                <RotateCcw className="h-3.5 w-3.5" /> Reschedule
                              </Button>
                              {isDue && (
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300" onClick={() => updateStatus(apt.id, 'No Show')}>
                                  <AlertTriangle className="h-3.5 w-3.5" /> No Show
                                </Button>
                              )}
                              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => setAdminCancelId(apt.id)}>
                                <XCircle className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Details Dialog - Modernized */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {/* Dialog Header with gradient accent */}
          <div className="sticky top-0 z-10 bg-card border-b border-border/50">
            <DialogHeader className="p-5 pb-4">
              <DialogTitle className="text-lg">
                {selectedAppointment?.is_group_booking
                  ? `${(memberMap.get(selectedAppointment?.id || 0)?.length || 0) === 1 ? 'Companion' : 'Group'} Booking`
                  : 'Patient Details'}
              </DialogTitle>
              {selectedAppointment?.is_group_booking && (
                <p className="text-sm text-muted-foreground mt-0.5">Booked by {selectedAppointment?.patient_name}</p>
              )}
            </DialogHeader>
          </div>

          <div className="p-5 pt-0 space-y-5">
            {/* Appointment Info Card */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appointment Details</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Date</span>
                    <span className="font-medium text-foreground">{selectedAppointment && new Date(selectedAppointment.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Time</span>
                    <span className="font-medium text-foreground">{selectedAppointment?.appointment_time}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Status</span>
                    <span><Badge variant={getStatusVariant(selectedAppointment?.status || '') as "pending" | "confirmed" | "completed" | "cancelled" | "noshow"}>{selectedAppointment?.status}</Badge></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Booking Type</span>
                    <span className="font-medium text-foreground">{selectedAppointment?.is_group_booking ? (groupMembers.length === 1 ? 'Companion' : `Group (${groupMembers.length})`) : 'Individual'}</span>
                  </div>
                  {selectedAppointment?.contact && (
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Contact</span>
                      <span className="font-medium text-foreground">{selectedAppointment.contact}</span>
                    </div>
                  )}
                  {selectedAppointment?.notes && (
                    <div className="flex flex-col col-span-2">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Notes</span>
                      <span className="text-foreground">{selectedAppointment.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Selector - only for Confirmed status */}
            {selectedAppointment?.status === 'Confirmed' && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border/30 flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Service</p>
                </div>
                <div className="p-4">
                  <Select
                    value={selectedAppointment.service || ''}
                    onValueChange={async (value) => {
                      try {
                        await appointmentsAPI.updateService(selectedAppointment.id, value);
                        setSelectedAppointment({ ...selectedAppointment, service: value });
                        loadAppointments();
                        toast({ title: 'Service Assigned', description: `Service set to "${value}"` });
                      } catch {
                        toast({ title: 'Error', description: 'Failed to assign service', variant: 'destructive' });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a service for this appointment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.filter(s => s.is_active).map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAppointment.service && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Current service: <span className="font-medium text-foreground">{selectedAppointment.service}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Show assigned service for non-confirmed statuses */}
            {selectedAppointment?.status !== 'Confirmed' && selectedAppointment?.service && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border/30 flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</p>
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-foreground">{selectedAppointment.service}</p>
                </div>
              </div>
            )}

            {/* Patient Profile (Individual) */}
            {!selectedAppointment?.is_group_booking && patientProfile && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Profile</p>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Full Name</span>
                      <span className="font-medium text-foreground">{patientProfile.first_name} {patientProfile.middle_name || ''} {patientProfile.last_name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Gender</span>
                      <span className="font-medium text-foreground">{patientProfile.gender || 'N/A'}</span>
                    </div>
                    {patientProfile.date_of_birth && (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Date of Birth</span>
                          <span className="font-medium text-foreground">{new Date(patientProfile.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Age</span>
                          <span className="font-medium text-foreground">{calculateAge(patientProfile.date_of_birth)} years old</span>
                        </div>
                      </>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Phone</span>
                      <span className="font-medium text-foreground">{patientProfile.phone || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Address</span>
                      <span className="font-medium text-foreground">{patientProfile.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Medical History (Individual) */}
            {!selectedAppointment?.is_group_booking && medicalAssessment && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical History</p>
                </div>
                <div className="p-4 space-y-2.5 text-sm">
                  {[
                    { label: 'Good health?', val: medicalAssessment.q1 },
                    { label: 'Under treatment?', val: medicalAssessment.q2, detail: medicalAssessment.q2_details },
                    { label: 'Medications?', val: medicalAssessment.q3, detail: medicalAssessment.q3_details },
                    { label: 'Hospitalized?', val: medicalAssessment.q4, detail: medicalAssessment.q4_details },
                    { label: 'Allergies?', val: medicalAssessment.q5, detail: medicalAssessment.q5_details },
                    { label: 'Pregnant/nursing?', val: medicalAssessment.q6 },
                  ].map((q, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[130px] shrink-0">{q.label}</span>
                      <span className="font-medium text-foreground capitalize">{q.val || 'N/A'}</span>
                      {q.detail && <span className="text-muted-foreground">— {q.detail}</span>}
                    </div>
                  ))}
                  {medicalAssessment.last_checkup && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[130px] shrink-0">Last checkup</span>
                      <span className="font-medium text-foreground">{new Date(medicalAssessment.last_checkup + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  {medicalAssessment.other_medical && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[130px] shrink-0">Other</span>
                      <span className="font-medium text-foreground">{medicalAssessment.other_medical}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Group Members */}
            {selectedAppointment?.is_group_booking && groupMembers.length > 0 && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {groupMembers.length === 1 ? 'Companion' : `Group Members (${groupMembers.length})`}
                  </p>
                </div>
                <div className="divide-y divide-border/30">
                  {groupMembers.map((member) => {
                    const isExpanded = expandedGroupMember === member.id;
                    return (
                      <div key={member.id} className="overflow-hidden">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors" onClick={() => setExpandedGroupMember(isExpanded ? null : member.id)}>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm">{member.member_name}</span>
                              {member.is_primary && <Badge variant="outline" className="text-[10px]">Primary</Badge>}
                              {member.relationship && <span className="text-xs text-muted-foreground">({member.relationship})</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>Time: {member.appointment_time}</span>
                              {member.date_of_birth && <span>Age: {calculateAge(member.date_of_birth)}</span>}
                              {member.gender && <span>{member.gender}</span>}
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 bg-muted/20">
                            <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                              {member.date_of_birth && (
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Date of Birth</span>
                                  <span className="font-medium text-foreground">{new Date(member.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Phone</span>
                                  <span className="font-medium text-foreground">{member.phone}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Medical History</p>
                              {renderMemberMedical(member)}
                            </div>
                            {selectedAppointment?.status === 'Confirmed' && (
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => selectedAppointment && openPrescriptionForm(selectedAppointment.user_id, selectedAppointment.id, member.id, member.member_name)}>
                                <Upload className="h-3.5 w-3.5" /> Upload Prescription
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Prescriptions Section */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b border-border/30 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prescriptions</p>
                {selectedAppointment && !selectedAppointment.is_group_booking && selectedAppointment.status === 'Confirmed' && (
                  <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => openPrescriptionForm(selectedAppointment.user_id, selectedAppointment.id, undefined, selectedAppointment.patient_name)}>
                    <Upload className="h-3 w-3" /> Upload
                  </Button>
                )}
              </div>
              <div className="p-4">
                {prescriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No prescriptions yet</p>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.map((rx) => {
                      const memberName = rx.group_member_id ? groupMembers.find(m => m.id === rx.group_member_id)?.member_name : undefined;
                      return (
                        <div key={rx.id} className="bg-muted/30 rounded-lg overflow-hidden border border-border/30">
                          <div className="p-3 flex justify-between items-center">
                            <div>
                              <span className="font-medium text-sm text-foreground">{rx.prescribed_by}</span>
                              {memberName && <Badge variant="outline" className="text-[10px] ml-2">For: {memberName}</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          {rx.image_url && (
                            <div className="cursor-pointer border-t border-border/30 hover:opacity-90 transition-opacity" onClick={() => setViewingImage(rx.image_url)}>
                              <img src={rx.image_url} alt="Prescription" className="w-full max-h-48 object-contain bg-white" />
                              <p className="text-center py-1.5 text-[11px] text-muted-foreground bg-muted/20">Click to view full size</p>
                            </div>
                          )}
                          {!rx.image_url && rx.medications && (
                            <div className="px-3 pb-3 text-sm text-muted-foreground border-t border-border/30 pt-2">{rx.medications}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prescription Upload Dialog */}
      <Dialog open={showPrescriptionForm} onOpenChange={setShowPrescriptionForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Prescription Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {prescriptionTarget.memberName && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Patient:</span> <span className="font-medium text-foreground">{prescriptionTarget.memberName}</span>
              </div>
            )}
            <div>
              <Label>Prescribed By</Label>
              <Input value={prescribedBy} onChange={(e) => setPrescribedBy(e.target.value)} placeholder="Doctor name" />
            </div>
            <div>
              <Label>Prescription Image *</Label>
              <p className="text-xs text-muted-foreground mb-2">Upload a photo or scan of the prescription (RX)</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              {!imagePreview ? (
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-secondary/50 transition-colors group">
                  <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2 group-hover:text-secondary transition-colors" />
                  <p className="text-sm font-medium text-foreground">Click to select image</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 10MB</p>
                </button>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain bg-card" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => fileInputRef.current?.click()} title="Replace"><Upload className="h-3 w-3" /></Button>
                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => { setSelectedImage(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} title="Remove"><X className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={submitPrescription} className="w-full gap-2" disabled={uploading || !selectedImage}>
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload Prescription</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Image Viewer - No print button */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>Prescription Image</span>
              <Button variant="outline" size="sm" className="gap-1 mr-6" onClick={async () => {
                if (!viewingImage) return;
                try {
                  const response = await fetch(viewingImage);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `prescription.${blob.type.split('/')[1] || 'jpg'}`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch {
                  window.open(viewingImage, '_blank');
                }
              }}>
                <Download className="h-3 w-3" /> Save
              </Button>
            </DialogTitle>
          </DialogHeader>
          {viewingImage && <img src={viewingImage} alt="Prescription" className="w-full object-contain rounded-lg bg-white max-h-[70vh]" />}
        </DialogContent>
      </Dialog>

      {/* Admin Cancel with Reason Dialog */}
      <AlertDialog open={!!adminCancelId} onOpenChange={(open) => { if (!open) { setAdminCancelId(null); setAdminCancelReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment and notify the patient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-sm font-medium">Reason for cancellation *</Label>
            <Textarea
              value={adminCancelReason}
              onChange={(e) => setAdminCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this appointment..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setAdminCancelId(null); setAdminCancelReason(''); }}>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!adminCancelReason.trim()}
              onClick={async () => {
                if (!adminCancelId || !adminCancelReason.trim()) return;
                const apt = appointments.find(a => a.id === adminCancelId);
                await updateStatus(adminCancelId, 'Cancelled');
                if (apt) {
                  await notificationsAPI.create({
                    user_id: apt.user_id,
                    title: 'Appointment Cancelled by Clinic',
                    message: `Your appointment on ${apt.appointment_date} at ${apt.appointment_time} has been cancelled.\n\nReason: ${adminCancelReason.trim()}`,
                    type: 'cancellation',
                    related_appointment_id: adminCancelId,
                  });
                }
                setAdminCancelId(null);
                setAdminCancelReason('');
              }}
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog (Admin - unlimited, no time check) */}
      <RescheduleDialog
        open={!!rescheduleId}
        onOpenChange={(open) => !open && setRescheduleId(null)}
        currentDate={rescheduleApt?.appointment_date || ''}
        currentTime={rescheduleApt?.appointment_time || ''}
        onReschedule={handleAdminReschedule}
      />

      {/* Admin Success Modal */}
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        description={successModal.description}
        onClose={() => setSuccessModal({ open: false, title: '', description: '' })}
      />
    </div>
  );
}
