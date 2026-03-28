export interface User {
  id: string;
  username: string;
  phone: string;
  country_code: string;
  role: 'user' | 'admin';
  no_show_count?: number;
  is_banned?: boolean;
}

export interface PatientProfile {
  id?: number;
  user_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone: string;
  is_complete: boolean;
}

export interface MedicalAssessment {
  id?: number;
  user_id: string;
  q1: string;
  q2: string;
  q2_details: string;
  q3: string;
  q3_details: string;
  q4: string;
  q4_details: string;
  q5: string;
  q5_details: string;
  q6: string;
  last_checkup: string;
  other_medical: string;
  consent: boolean;
  is_submitted: boolean;
}

export interface Appointment {
  id: number;
  user_id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  duration_min: number;
  notes: string;
  contact: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show';
  is_group_booking: boolean;
  cancelled_at?: string | null;
  created_at?: string;
  group_members?: GroupMember[];
  reschedule_count?: number;
  rescheduled_at?: string | null;
  original_date?: string | null;
  original_time?: string | null;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'new_booking' | 'cancellation' | 'reschedule' | 'reminder' | 'no_show_warning' | 'status_change' | 'ban_notice';
  is_read: boolean;
  created_at: string;
}

export interface AppNotification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'appointment_reminder' | 'booking_new' | 'booking_cancelled' | 'booking_rescheduled' | 'no_show_warning' | 'ban_notice' | 'status_change';
  related_appointment_id?: number | null;
  is_read: boolean;
  created_at: string;
}

export interface UserBan {
  id: number;
  user_id: string;
  banned_by: string;
  reason: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string | null;
}

export interface GroupMember {
  id?: number;
  appointment_id?: number;
  member_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  relationship: string;
  appointment_time: string;
  is_primary: boolean;
  linked_user_id?: string | null;
  // Medical assessment fields
  med_q1: string;
  med_q2: string;
  med_q2_details: string;
  med_q3: string;
  med_q3_details: string;
  med_q4: string;
  med_q4_details: string;
  med_q5: string;
  med_q5_details: string;
  med_q6: string;
  med_last_checkup: string;
  med_other: string;
  med_consent: boolean;
}

export interface Prescription {
  id: number;
  user_id: string;
  appointment_id?: number | null;
  group_member_id?: number | null;
  prescribed_by: string;
  medications: string;
  diagnosis: string;
  instructions: string;
  image_url?: string | null;
  prescription_date: string;
  created_at?: string;
}

export interface ClinicService {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface ClinicScheduleDay {
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
}

export type ClinicSchedule = Record<string, ClinicScheduleDay>;

export interface TimeSlot {
  label: string;
  value: string;
  available: boolean;
}

export type DashboardPage = 'dashboard' | 'appointments' | 'group-booking' | 'profile' | 'settings' | 'services' | 'prescriptions';
export type AdminPage = 'dashboard' | 'appointments' | 'patients' | 'schedule' | 'services' | 'prescriptions';

export function getBookingTypeLabel(isGroupBooking: boolean, memberCount?: number): string {
  if (!isGroupBooking) return 'Individual';
  if (memberCount === 1) return 'Companion';
  return 'Group';
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function statusVariant(status: string) {
  switch (status) {
    case 'Confirmed': return 'confirmed' as const;
    case 'Pending': return 'pending' as const;
    case 'Completed': return 'completed' as const;
    case 'Cancelled': return 'cancelled' as const;
    case 'No Show': return 'noshow' as const;
    default: return 'default' as const;
  }
}
