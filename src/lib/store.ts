import { create } from 'zustand';
import { authAPI } from './api';
import type { User, Appointment, PatientProfile, MedicalAssessment } from './types';

// ========== HELPER FUNCTIONS FOR LOCALSTORAGE ==========
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ========== AUTH STORE ==========
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, phone: string, countryCode: string, password: string) => Promise<{ success: boolean; message: string }>;
  adminLogin: (usernameOrPhone: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadJSON<User | null>('qd_user', null),
  isAuthenticated: loadJSON<boolean>('qd_auth', false),

  login: async (phoneOrUsername, password) => {
    const result = await authAPI.login(phoneOrUsername, password);
    if (result.success && result.user) {
      saveJSON('qd_user', result.user);
      saveJSON('qd_auth', true);
      set({ user: result.user, isAuthenticated: true });
    }
    return { success: result.success, message: result.message };
  },

  register: async (username, phone, countryCode, password) => {
    const result = await authAPI.register(username, phone, countryCode, password);
    return { success: result.success, message: result.message };
  },

  adminLogin: async (usernameOrPhone, password) => {
    const result = await authAPI.adminLogin(usernameOrPhone, password);
    if (result.success && result.user) {
      saveJSON('qd_user', result.user);
      saveJSON('qd_auth', true);
      set({ user: result.user, isAuthenticated: true });
    }
    return { success: result.success, message: result.message };
  },

  logout: () => {
    saveJSON('qd_user', null);
    saveJSON('qd_auth', false);
    set({ user: null, isAuthenticated: false });
  },
}));

// ========== APPOINTMENTS STORE ==========
interface AppointmentsState {
  appointments: Appointment[];
  isLoading: boolean;
  fetchAppointments: () => void;
  addAppointment: (apt: Omit<Appointment, 'id' | 'status' | 'createdAt'>) => Appointment;
  updateStatus: (id: number, status: Appointment['status']) => void;
  deleteAppointment: (id: number) => void;
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: loadJSON<Appointment[]>('qd_appointments', []),
  isLoading: false,

  fetchAppointments: () => {
    const appointments = loadJSON<Appointment[]>('qd_appointments', []);
    set({ appointments });
  },

  addAppointment: (data) => {
    const apt: Appointment = {
      ...data,
      id: Date.now(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    const updated = [apt, ...get().appointments];
    saveJSON('qd_appointments', updated);
    set({ appointments: updated });
    return apt;
  },

  updateStatus: (id, status) => {
    const updated = get().appointments.map(a =>
      a.id === id ? { ...a, status } : a
    );
    saveJSON('qd_appointments', updated);
    set({ appointments: updated });
  },

  deleteAppointment: (id) => {
    const updated = get().appointments.filter(a => a.id !== id);
    saveJSON('qd_appointments', updated);
    set({ appointments: updated });
  },
}));

// ========== PATIENT PROFILE STORE ==========
interface ProfileState {
  profile: PatientProfile;
  assessment: MedicalAssessment;
  assessmentSubmitted: boolean;
  updateProfile: (data: Partial<PatientProfile>) => void;
  updateAssessment: (data: Partial<MedicalAssessment>) => void;
  submitAssessment: () => void;
}

const emptyProfile: PatientProfile = {
  firstName: '', lastName: '', middleName: '',
  age: null, gender: '', address: '', phone: '',
};

const emptyAssessment: MedicalAssessment = {
  q1: '', q2: '', q2Details: '', q3: '', q3Details: '',
  q4: '', q4Details: '', q5: '', q5Details: '', q6: '',
  lastCheckup: '', otherMedical: '', consent: false,
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: loadJSON('qd_profile', emptyProfile),
  assessment: loadJSON('qd_assessment', emptyAssessment),
  assessmentSubmitted: loadJSON('qd_assessment_done', false),

  updateProfile: (data) => {
    const updated = { ...get().profile, ...data };
    saveJSON('qd_profile', updated);
    set({ profile: updated });
  },

  updateAssessment: (data) => {
    const updated = { ...get().assessment, ...data };
    saveJSON('qd_assessment', updated);
    set({ assessment: updated });
  },

  submitAssessment: () => {
    saveJSON('qd_assessment_done', true);
    set({ assessmentSubmitted: true });
  },
}));
