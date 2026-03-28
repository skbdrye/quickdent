import { create } from 'zustand';
import { authAPI, appointmentsAPI, profileAPI, assessmentAPI, servicesAPI, clinicSettingsAPI, prescriptionsAPI } from './api';
import type { User, Appointment, PatientProfile, MedicalAssessment, ClinicService, ClinicSchedule, Prescription } from './types';

// ========== HELPER FUNCTIONS FOR LOCALSTORAGE ==========
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ========== AUTH STORE ==========
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, phone: string, countryCode: string, password: string) => Promise<{ success: boolean; message: string }>;
  adminLogin: (usernameOrPhone: string, password: string) => Promise<{ success: boolean; message: string }>;
  setUser: (user: User) => void;
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

  setUser: (user: User) => {
    saveJSON('qd_user', user);
    set({ user });
  },
}));

// ========== APPOINTMENTS STORE ==========
interface AppointmentsState {
  appointments: Appointment[];
  isLoading: boolean;
  fetchAppointments: () => Promise<void>;
  fetchUserAppointments: (userId: string) => Promise<void>;
  addAppointment: (apt: Omit<Appointment, 'id' | 'created_at' | 'cancelled_at' | 'group_members'>) => Promise<Appointment>;
  updateStatus: (id: number, status: Appointment['status']) => Promise<void>;
  deleteAppointment: (id: number) => Promise<void>;
  fetchBookedSlots: (date: string) => Promise<string[]>;
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: [],
  isLoading: false,

  fetchAppointments: async () => {
    set({ isLoading: true });
    try {
      const appointments = await appointmentsAPI.fetchAll();
      set({ appointments, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUserAppointments: async (userId: string) => {
    set({ isLoading: true });
    try {
      const appointments = await appointmentsAPI.fetchByUser(userId);
      set({ appointments, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addAppointment: async (data) => {
    const apt = await appointmentsAPI.create(data);
    set({ appointments: [apt, ...get().appointments] });
    return apt;
  },

  updateStatus: async (id, status) => {
    await appointmentsAPI.updateStatus(id, status);
    set({
      appointments: get().appointments.map(a =>
        a.id === id ? { ...a, status, cancelled_at: status === 'Cancelled' ? new Date().toISOString() : a.cancelled_at } : a
      ),
    });
  },

  deleteAppointment: async (id) => {
    await appointmentsAPI.delete(id);
    set({ appointments: get().appointments.filter(a => a.id !== id) });
  },

  fetchBookedSlots: async (date: string) => {
    return appointmentsAPI.fetchBookedSlots(date);
  },
}));

// ========== PROFILE STORE ==========
interface ProfileState {
  profile: PatientProfile | null;
  assessment: MedicalAssessment | null;
  isLoading: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  fetchAssessment: (userId: string) => Promise<void>;
  updateProfile: (userId: string, data: Partial<PatientProfile>) => Promise<void>;
  updateAssessment: (userId: string, data: Partial<MedicalAssessment>) => Promise<void>;
  saveAssessment: (userId: string) => Promise<void>;
  submitAssessment: (userId: string) => Promise<void>;
  isProfileComplete: () => boolean;
  isAssessmentSubmitted: () => boolean;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  assessment: null,
  isLoading: false,

  fetchProfile: async (userId) => {
    set({ isLoading: true });
    const profile = await profileAPI.fetch(userId);
    set({ profile, isLoading: false });
  },

  fetchAssessment: async (userId) => {
    const assessment = await assessmentAPI.fetch(userId);
    set({ assessment });
  },

  updateProfile: async (userId, data) => {
    const current = get().profile;
    const updated = { ...current, ...data, user_id: userId } as PatientProfile;
    const isComplete = !!(updated.first_name && updated.last_name && updated.date_of_birth && updated.gender && updated.phone);
    updated.is_complete = isComplete;
    await profileAPI.upsert(updated);
    set({ profile: updated });
  },

  updateAssessment: async (userId, data) => {
    // Only update local state - do NOT call API on every keystroke
    const current = get().assessment;
    const updated = { ...current, ...data, user_id: userId } as MedicalAssessment;
    set({ assessment: updated });
  },

  saveAssessment: async (userId) => {
    // Explicitly save to DB (called only on form submit)
    const current = get().assessment;
    if (!current) return;
    await assessmentAPI.upsert({ ...current, user_id: userId });
  },

  submitAssessment: async (userId) => {
    const current = get().assessment;
    if (!current) return;
    const updated = { ...current, user_id: userId, is_submitted: true, consent: true };
    await assessmentAPI.upsert(updated);
    set({ assessment: updated });
  },

  isProfileComplete: () => {
    const p = get().profile;
    return !!(p && p.first_name && p.last_name && p.date_of_birth && p.gender && p.phone);
  },

  isAssessmentSubmitted: () => {
    return get().assessment?.is_submitted || false;
  },
}));

// ========== CLINIC STORE ==========
interface ClinicState {
  services: ClinicService[];
  schedule: ClinicSchedule | null;
  isLoading: boolean;
  fetchServices: () => Promise<void>;
  fetchSchedule: () => Promise<void>;
  addService: (name: string) => Promise<void>;
  updateService: (id: number, updates: Partial<ClinicService>) => Promise<void>;
  deleteService: (id: number) => Promise<void>;
  updateSchedule: (schedule: ClinicSchedule) => Promise<void>;
}

export const useClinicStore = create<ClinicState>((set, get) => ({
  services: [],
  schedule: null,
  isLoading: false,

  fetchServices: async () => {
    const services = await servicesAPI.fetchAll();
    set({ services });
  },

  fetchSchedule: async () => {
    const schedule = await clinicSettingsAPI.fetchSchedule();
    set({ schedule });
  },

  addService: async (name) => {
    const maxOrder = Math.max(0, ...get().services.map(s => s.sort_order));
    await servicesAPI.create(name, maxOrder + 1);
    await get().fetchServices();
  },

  updateService: async (id, updates) => {
    await servicesAPI.update(id, updates);
    set({ services: get().services.map(s => s.id === id ? { ...s, ...updates } : s) });
  },

  deleteService: async (id) => {
    await servicesAPI.delete(id);
    set({ services: get().services.filter(s => s.id !== id) });
  },

  updateSchedule: async (schedule) => {
    await clinicSettingsAPI.updateSchedule(schedule);
    set({ schedule });
  },
}));

// ========== PRESCRIPTIONS STORE ==========
interface PrescriptionsState {
  prescriptions: Prescription[];
  isLoading: boolean;
  fetchByUser: (userId: string) => Promise<void>;
  fetchByGroupMembers: (memberIds: number[]) => Promise<Prescription[]>;
  fetchAll: () => Promise<void>;
  fetchByAppointment: (appointmentId: number) => Promise<Prescription[]>;
  addPrescription: (prescription: Omit<Prescription, 'id' | 'created_at'>) => Promise<Prescription>;
  updatePrescription: (id: number, updates: Partial<Prescription>) => Promise<void>;
  uploadImage: (file: File, prescriptionId: number) => Promise<string>;
}

export const usePrescriptionsStore = create<PrescriptionsState>((set, get) => ({
  prescriptions: [],
  isLoading: false,

  fetchByUser: async (userId) => {
    set({ isLoading: true });
    const prescriptions = await prescriptionsAPI.fetchByUser(userId);
    set({ prescriptions, isLoading: false });
  },

  fetchByGroupMembers: async (memberIds) => {
    return prescriptionsAPI.fetchByGroupMemberIds(memberIds);
  },

  fetchAll: async () => {
    set({ isLoading: true });
    const prescriptions = await prescriptionsAPI.fetchAll();
    set({ prescriptions, isLoading: false });
  },

  fetchByAppointment: async (appointmentId) => {
    return prescriptionsAPI.fetchByAppointment(appointmentId);
  },

  addPrescription: async (prescription) => {
    const created = await prescriptionsAPI.create(prescription);
    set({ prescriptions: [created, ...get().prescriptions] });
    return created;
  },

  updatePrescription: async (id, updates) => {
    await prescriptionsAPI.update(id, updates);
    set({
      prescriptions: get().prescriptions.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  },

  uploadImage: async (file, prescriptionId) => {
    const url = await prescriptionsAPI.uploadImage(file, prescriptionId);
    await prescriptionsAPI.update(prescriptionId, { image_url: url });
    set({
      prescriptions: get().prescriptions.map(p =>
        p.id === prescriptionId ? { ...p, image_url: url } : p
      ),
    });
    return url;
  },
}));
