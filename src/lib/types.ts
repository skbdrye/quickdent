export interface User {
  id: string;
  username: string;
  phone: string;
  country_code: string;
  role: 'user' | 'admin';
  no_show_count?: number;
  is_banned?: boolean;
  onboarding_completed?: boolean;
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
  patient_type?: 'new' | 'existing' | null;
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
  service?: string | null;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'new_booking' | 'cancellation' | 'reschedule' | 'reminder' | 'no_show_warning' | 'status_change' | 'ban_notice' | 'prescription' | 'xray' | 'standby';
  is_read: boolean;
  created_at: string;
  related_appointment_id?: number | null;
  related_id?: number | null;
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
  /** Services chosen for this member (kept as array to match the DB schema). */
  services?: string[] | null;
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
  images?: string[];
  prescription_date: string;
  created_at?: string;
}

export interface ClinicService {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  available_days?: string[];
}

export interface Xray {
  id: number;
  user_id: string;
  appointment_id?: number | null;
  group_member_id?: number | null;
  uploaded_by: string;
  image_url: string;
  images?: string[];
  notes: string;
  xray_date: string;
  created_at?: string;
}

export interface StandbyRequest {
  id: number;
  user_id: string;
  patient_name: string;
  contact: string;
  preferred_date: string;
  reason: string;
  status: 'Waiting' | 'Confirmed' | 'Expired' | 'Cancelled';
  assigned_time?: string | null;
  admin_notes?: string | null;
  created_at?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  med_q1?: string | null;
  med_q2?: string | null;
  med_q2_details?: string | null;
  med_q3?: string | null;
  med_q3_details?: string | null;
  med_q4?: string | null;
  med_q4_details?: string | null;
  med_q5?: string | null;
  med_q5_details?: string | null;
  med_q6?: string | null;
  med_last_checkup?: string | null;
  med_other?: string | null;
  med_consent?: boolean | null;
  saved_companion_id?: number | null;
}

export interface SavedCompanion {
  id: number;
  owner_id: string;
  member_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  relationship?: string | null;
  med_q1?: string | null;
  med_q2?: string | null;
  med_q2_details?: string | null;
  med_q3?: string | null;
  med_q3_details?: string | null;
  med_q4?: string | null;
  med_q4_details?: string | null;
  med_q5?: string | null;
  med_q5_details?: string | null;
  med_q6?: string | null;
  med_last_checkup?: string | null;
  med_other?: string | null;
  med_consent?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleOverride {
  id?: number;
  override_date: string;
  is_open: boolean;
  open_time?: string | null;
  close_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  reason?: string | null;
  doctors_count?: number | null;
  max_per_slot?: number | null;
  max_daily?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClinicScheduleDay {
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
  /** Number of doctors working that day (default 1). Drives default max_per_slot. */
  doctors_count?: number;
  /** Maximum simultaneous bookings per time slot. Defaults to doctors_count. */
  max_per_slot?: number;
  /** Maximum bookings allowed across the entire day. null/undefined = unlimited. */
  max_daily?: number | null;
}

export type ClinicSchedule = Record<string, ClinicScheduleDay>;

export interface TimeSlot {
  label: string;
  value: string;
  available: boolean;
}

export type DashboardPage = 'dashboard' | 'my-appointments' | 'appointments' | 'group-booking' | 'profile' | 'settings' | 'services' | 'prescriptions' | 'xrays' | 'standby';
export type AdminPage = 'dashboard' | 'appointments' | 'patients' | 'schedule' | 'services' | 'prescriptions' | 'xrays' | 'standby-queue';

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
