export interface User {
  id: string; // UUID from database
  username: string;
  phone: string;
  country_code: string;
  role: 'user' | 'admin';
}

export interface PatientProfile {
  firstName: string;
  lastName: string;
  middleName: string;
  age: number | null;
  gender: string;
  address: string;
  phone: string;
}

export interface MedicalAssessment {
  q1: 'yes' | 'no' | '';
  q2: 'yes' | 'no' | '';
  q2Details: string;
  q3: 'yes' | 'no' | '';
  q3Details: string;
  q4: 'yes' | 'no' | '';
  q4Details: string;
  q5: 'yes' | 'no' | '';
  q5Details: string;
  q6: 'yes' | 'no' | '';
  lastCheckup: string;
  otherMedical: string;
  consent: boolean;
}

export interface Appointment {
  id: number;
  patient: string;
  userId?: string; // UUID from database
  appointmentDate: string;
  appointmentTime24: string;
  durationMin: number;
  reason: string;
  provider: string;
  contact: string;
  notes: string;
  status: 'Pending' | 'Approved' | 'Declined' | 'Completed';
  createdAt?: string;
  isGroupBooking?: boolean;
  groupMembers?: GroupMember[];
}

export interface GroupMember {
  name: string;
  age: number | null;
  relationship: string;
  service: string;
}

export interface TimeSlot {
  label: string;
  value: string;
  available: boolean;
}

export type DashboardPage = 'dashboard' | 'appointments' | 'group-booking' | 'profile' | 'settings';
export type AdminPage = 'dashboard' | 'appointments' | 'group-booking' | 'patients';
