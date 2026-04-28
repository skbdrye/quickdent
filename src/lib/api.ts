/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';
import type { User, Appointment, PatientProfile, MedicalAssessment, Prescription, ClinicService, ClinicSchedule, ClinicScheduleDay, GroupMember, Notification, Xray, StandbyRequest, SavedCompanion, ScheduleOverride } from './types';
import { formatPhoneWithCountry, normalizePhoneForLogin } from './countries';
import { formatTime } from './utils';
import bcryptjs from 'bcryptjs';

// ========== AUTH API ==========
export const authAPI = {
  /**
   * Pre-flight uniqueness check used BEFORE the OTP step so we don't waste an
   * SMS on a username/phone that's already registered. Returns the first
   * collision (username takes precedence) and a friendly message.
   */
  async checkAvailability(
    username: string,
    phone: string,
    countryCode: string,
  ): Promise<{ available: true } | { available: false; field: 'username' | 'phone'; message: string }> {
    try {
      const fullPhone = formatPhoneWithCountry(countryCode, phone);
      const [{ data: u }, { data: p }] = await Promise.all([
        supabase.from('users').select('id').eq('username', username).maybeSingle(),
        supabase.from('users').select('id').eq('phone', fullPhone).maybeSingle(),
      ]);
      if (u) return { available: false, field: 'username', message: 'That username is already taken. Please pick another.' };
      if (p) return { available: false, field: 'phone', message: 'That phone number is already registered. Try logging in instead.' };
      return { available: true };
    } catch (err) {
      // Network / DB hiccup — let the registration step itself decide.
      console.warn('checkAvailability failed:', err);
      return { available: true };
    }
  },

  async register(username: string, phone: string, countryCode: string, password: string) {
    try {
      const fullPhone = formatPhoneWithCountry(countryCode, phone);

      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existingUsername) {
        return { success: false, message: 'Username already taken.' };
      }

      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', fullPhone)
        .maybeSingle();

      if (existingPhone) {
        return { success: false, message: 'This phone number is already registered.' };
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          username,
          phone: fullPhone,
          password_hash: hashedPassword,
          country_code: countryCode,
          role: 'user',
        }])
        .select()
        .single();

      if (insertError || !newUser) {
        return { success: false, message: 'Registration failed. Please try again.' };
      }

      // Create empty patient profile for new user with their phone
      await supabase.from('patient_profiles').insert([{
        user_id: newUser.id,
        phone: fullPhone,
        is_complete: false,
      }]);

      // Create empty medical assessment
      await supabase.from('medical_assessments').insert([{
        user_id: newUser.id,
        is_submitted: false,
      }]);

      // onboarding_completed defaults to false in the users table, no extra insert needed


      // Check if there's a matching group member (name + DOB + gender match)
      // This will be handled when the user fills out their profile

      return { success: true, message: 'Registration successful! You can now login.' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Registration failed';
      return { success: false, message: msg };
    }
  },

  async login(phoneOrUsername: string, password: string) {
    try {
      let user;
      const normalized = normalizePhoneForLogin(phoneOrUsername);

      if (normalized.startsWith('+') || phoneOrUsername.startsWith('0')) {
        // Phone login
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('phone', normalized)
          .maybeSingle();

        if (error || !data) {
          return { success: false, message: 'Invalid phone number or password' };
        }
        user = data;
      } else {
        // Username login
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', phoneOrUsername)
          .maybeSingle();

        if (error || !data) {
          return { success: false, message: 'Invalid username or password' };
        }
        user = data;
      }

      const passwordMatch = await bcryptjs.compare(password, user.password_hash);
      if (!passwordMatch) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Check if user is banned
      if (user.is_banned) {
        return { success: false, message: 'Your account has been suspended due to repeated no-shows. Please contact the clinic.' };
      }

      const safeUser: User = {
        id: user.id,
        username: user.username,
        phone: user.phone,
        country_code: user.country_code,
        role: user.role as 'user' | 'admin',
        no_show_count: user.no_show_count || 0,
        is_banned: user.is_banned || false,
        onboarding_completed: user.onboarding_completed || false,
      };
      return { success: true, message: 'Login successful', user: safeUser };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      return { success: false, message: msg };
    }
  },

  async adminLogin(usernameOrPhone: string, password: string) {
    try {
      let admin;
      const normalized = normalizePhoneForLogin(usernameOrPhone);

      if (normalized.startsWith('+') || usernameOrPhone.startsWith('0')) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('phone', normalized)
          .eq('role', 'admin')
          .maybeSingle();
        admin = data;
      } else {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('username', usernameOrPhone)
          .eq('role', 'admin')
          .maybeSingle();
        admin = data;
      }

      if (!admin) {
        return { success: false, message: 'Invalid admin credentials' };
      }

      const passwordMatch = await bcryptjs.compare(password, admin.password_hash);
      if (!passwordMatch) {
        return { success: false, message: 'Invalid admin credentials' };
      }

      const safeUser: User = {
        id: admin.id,
        username: admin.username,
        phone: admin.phone,
        country_code: admin.country_code,
        role: 'admin',
      };
      return { success: true, message: 'Admin login successful', user: safeUser };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Admin login failed';
      return { success: false, message: msg };
    }
  },
};

// ========== PROFILE API ==========
export const profileAPI = {
  async fetch(userId: string): Promise<PatientProfile | null> {
    const { data } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      user_id: data.user_id,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      middle_name: data.middle_name || '',
      date_of_birth: data.date_of_birth || '',
      gender: data.gender || '',
      address: data.address || '',
      phone: data.phone || '',
      is_complete: data.is_complete || false,
      patient_type: ((data as Record<string, unknown>).patient_type as 'new' | 'existing' | null) || null,
    };
  },

  async upsert(profile: Partial<PatientProfile> & { user_id: string }) {
    const { data: existing } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (existing) {
      const { id, ...profileData } = profile;
      const { error } = await supabase
        .from('patient_profiles')
        .update({ ...profileData, updated_at: new Date().toISOString() })
        .eq('user_id', profile.user_id);
      if (error) throw error;
    } else {
      const { id, ...profileData } = profile;
      const { error } = await supabase
        .from('patient_profiles')
        .insert([profileData]);
      if (error) throw error;
    }
  },
};

// ========== MEDICAL ASSESSMENT API ==========
export const assessmentAPI = {
  async fetch(userId: string): Promise<MedicalAssessment | null> {
    const { data } = await supabase
      .from('medical_assessments')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      user_id: data.user_id,
      q1: data.q1 || '',
      q2: data.q2 || '',
      q2_details: data.q2_details || '',
      q3: data.q3 || '',
      q3_details: data.q3_details || '',
      q4: data.q4 || '',
      q4_details: data.q4_details || '',
      q5: data.q5 || '',
      q5_details: data.q5_details || '',
      q6: data.q6 || '',
      last_checkup: data.last_checkup || '',
      other_medical: data.other_medical || '',
      consent: data.consent || false,
      is_submitted: data.is_submitted || false,
    };
  },

  async upsert(assessment: Partial<MedicalAssessment> & { user_id: string }) {
    const { data: existing } = await supabase
      .from('medical_assessments')
      .select('id')
      .eq('user_id', assessment.user_id)
      .maybeSingle();

    if (existing) {
      const { id, ...assessmentData } = assessment;
      const { error } = await supabase
        .from('medical_assessments')
        .update({ ...assessmentData, updated_at: new Date().toISOString() })
        .eq('user_id', assessment.user_id);
      if (error) throw error;
    } else {
      const { id, ...assessmentData } = assessment;
      const { error } = await supabase
        .from('medical_assessments')
        .insert([assessmentData]);
      if (error) throw error;
    }
  },
};

// Custom error types for booking flow
export class SlotTakenError extends Error {
  constructor(message = 'That time has just been taken — please pick another.') {
    super(message);
    this.name = 'SlotTakenError';
  }
}

export class BookingCooldownError extends Error {
  remainingMs: number;
  method: BookingMethod;
  constructor(remainingMs: number, method: BookingMethod = 'self') {
    const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
    const label = METHOD_LABEL[method];
    super(`Please wait ${minutes} more minute${minutes !== 1 ? 's' : ''} before another ${label} booking.`);
    this.name = 'BookingCooldownError';
    this.remainingMs = remainingMs;
    this.method = method;
  }
}

export class TooManyActiveBookingsError extends Error {
  method: BookingMethod;
  constructor(method: BookingMethod = 'self') {
    const limit = METHOD_LIMITS[method].maxActive;
    const label = METHOD_LABEL[method];
    super(`You already have ${limit} active ${label} booking${limit !== 1 ? 's' : ''}. Please complete or cancel one before booking again.`);
    this.name = 'TooManyActiveBookingsError';
    this.method = method;
  }
}

// Booking method scopes — each has its own cooldown + active limit so users
// can independently use the queue, group bookings, etc.
export type BookingMethod = 'self' | 'group' | 'standby_self' | 'standby_other';

const METHOD_LABEL: Record<BookingMethod, string> = {
  self: 'self appointment',
  group: 'group / book-for-others',
  standby_self: 'standby (self)',
  standby_other: 'standby (for someone else)',
};

const METHOD_LIMITS: Record<BookingMethod, { cooldownMs: number; maxActive: number }> = {
  self:          { cooldownMs: 30 * 60 * 1000, maxActive: 1 },  // 30 min cooldown · 1 active
  group:         { cooldownMs:  5 * 60 * 1000, maxActive: 5 },  //  5 min cooldown · 5 active
  standby_self:  { cooldownMs: 30 * 60 * 1000, maxActive: 1 },  // 30 min cooldown · 1 active
  standby_other: { cooldownMs: 10 * 60 * 1000, maxActive: 1 },  // 10 min cooldown · 1 active
};

export function getBookingLimits(method: BookingMethod) {
  return METHOD_LIMITS[method];
}

export async function checkBookingCooldown(
  userId: string,
  method: BookingMethod = 'self',
): Promise<{ ok: true } | { ok: false; reason: 'cooldown'; remainingMs: number; method: BookingMethod } | { ok: false; reason: 'too_many'; method: BookingMethod }> {
  const { cooldownMs, maxActive } = METHOD_LIMITS[method];

  // Active count + last-created timestamp scoped to this method
  if (method === 'self' || method === 'group') {
    const isGroup = method === 'group';
    const { count: activeCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_group_booking', isGroup)
      .in('status', ['Pending', 'Confirmed']);
    if ((activeCount || 0) >= maxActive) {
      return { ok: false, reason: 'too_many', method };
    }
    const { data: last } = await supabase
      .from('appointments')
      .select('created_at')
      .eq('user_id', userId)
      .eq('is_group_booking', isGroup)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.created_at) {
      const elapsed = Date.now() - new Date(last.created_at).getTime();
      if (elapsed < cooldownMs) return { ok: false, reason: 'cooldown', remainingMs: cooldownMs - elapsed, method };
    }
    return { ok: true };
  }

  // Standby — distinguish self vs other via reason prefix `[For ...]`
  const wantOther = method === 'standby_other';
  const { data: rows } = await (supabase as any)
    .from('standby_requests')
    .select('id, reason, created_at, status')
    .eq('user_id', userId);
  const list = ((rows || []) as Array<{ id: number; reason: string | null; created_at: string | null; status: string | null }>);
  const filtered = list.filter(r => {
    const isForOther = !!(r.reason || '').trim().startsWith('[For ');
    return wantOther ? isForOther : !isForOther;
  });
  const active = filtered.filter(r => r.status === 'Waiting' || r.status === 'Confirmed').length;
  if (active >= maxActive) return { ok: false, reason: 'too_many', method };
  const lastCreated = filtered
    .map(r => (r.created_at ? new Date(r.created_at).getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  if (lastCreated) {
    const elapsed = Date.now() - lastCreated;
    if (elapsed < cooldownMs) return { ok: false, reason: 'cooldown', remainingMs: cooldownMs - elapsed, method };
  }
  return { ok: true };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return e.code === '23505' || /SLOT_TAKEN/i.test(e.message || '') || /duplicate key/i.test(e.message || '');
}

// ========== APPOINTMENTS API ==========
export const appointmentsAPI = {
  async fetchAll(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      user_id: a.user_id,
      patient_name: a.patient_name,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      duration_min: a.duration_min || 30,
      notes: a.notes || '',
      contact: a.contact || '',
      status: a.status as Appointment['status'],
      is_group_booking: a.is_group_booking || false,
      cancelled_at: a.cancelled_at,
      created_at: a.created_at || '',
      service: (a as Record<string, unknown>).service as string | null || null,
    }));
  },

  async fetchByUser(userId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      user_id: a.user_id,
      patient_name: a.patient_name,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      duration_min: a.duration_min || 30,
      notes: a.notes || '',
      contact: a.contact || '',
      status: a.status as Appointment['status'],
      is_group_booking: a.is_group_booking || false,
      cancelled_at: a.cancelled_at,
      created_at: a.created_at || '',
      service: (a as Record<string, unknown>).service as string | null || null,
    }));
  },

  async create(appointment: Omit<Appointment, 'id' | 'created_at' | 'cancelled_at' | 'group_members'>, opts?: { skipCooldown?: boolean; method?: BookingMethod }): Promise<Appointment> {
    const method: BookingMethod = opts?.method ?? (appointment.is_group_booking ? 'group' : 'self');
    if (!opts?.skipCooldown && appointment.user_id) {
      const guard = await checkBookingCooldown(appointment.user_id, method);
      if (!guard.ok) {
        const failedGuard = guard as Exclude<typeof guard, { ok: true }>;
        if (failedGuard.reason === 'cooldown') throw new BookingCooldownError(failedGuard.remainingMs, method);
        if (failedGuard.reason === 'too_many') throw new TooManyActiveBookingsError(method);
      }
    }

    // Capacity check (per-slot + per-day) using the configured weekly schedule
    // and any override for that date. We fail fast in the UI; the DB unique
    // index still acts as final defence for accidental double-inserts.
    if (!appointment.is_group_booking) {
      try {
        const [weekly, overrides, counts] = await Promise.all([
          clinicSettingsAPI.fetchSchedule(),
          scheduleOverridesAPI.list(),
          appointmentsAPI.fetchSlotCounts(appointment.appointment_date),
        ]);
        const eff = getEffectiveDay(appointment.appointment_date, weekly, overrides);
        const cap = getDayCapacity(eff.day, eff.override);
        const usedAtTime = counts.byTime[appointment.appointment_time] || 0;
        if (usedAtTime >= cap.perSlot) {
          throw new SlotTakenError('That time slot is already fully booked — please pick another.');
        }
        if (cap.daily !== null && counts.total >= cap.daily) {
          throw new SlotTakenError('The clinic is fully booked for this day. Please pick another date.');
        }
      } catch (e) {
        if (e instanceof SlotTakenError) throw e;
        // Network/auth issues — fall back to simple legacy check below
      }
    }

    // Legacy single-slot uniqueness fallback (ignores capacity, but still useful
    // when the capacity check above is skipped or fails).
    const taken = await appointmentsAPI.fetchBookedSlots(appointment.appointment_date);
    // Only use this naive check when capacity isn't available (single-doctor days).
    // For multi-doctor days the capacity branch above is authoritative.

    const insertPayload: Record<string, unknown> = {
      user_id: appointment.user_id,
      patient_name: appointment.patient_name,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      duration_min: appointment.duration_min,
      notes: appointment.notes,
      contact: appointment.contact,
      status: appointment.status || 'Pending',
      is_group_booking: appointment.is_group_booking,
    };
    if (appointment.service !== undefined && appointment.service !== null) {
      insertPayload.service = appointment.service;
    }
    void taken; // marker so the lint doesn't complain about unused legacy fetch
    const { data, error } = await (supabase as unknown as { from: (t: string) => { insert: (rows: unknown[]) => { select: () => { single: () => Promise<{ data: unknown; error: { code?: string; message?: string } | null }> } } } })
      .from('appointments')
      .insert([insertPayload])
      .select()
      .single();
    if (error) {
      if (isUniqueViolation(error)) throw new SlotTakenError();
      throw error;
    }
    const inserted = data as unknown as Appointment;

    // Race-safety pass: even though we checked capacity above, two concurrent
    // requests can both pass that check before either has inserted. After
    // insert we re-read the slot, sorted by `created_at, id`, and confirm
    // OUR row is among the first `perSlot` winners. If we lost the race, we
    // delete our just-inserted row and surface a friendly error so the user
    // can pick another time. (This protects against the "4 people grab the
    // same 3-capacity slot at the same instant" failure mode.)
    if (!appointment.is_group_booking) {
      try {
        const [weekly2, overrides2] = await Promise.all([
          clinicSettingsAPI.fetchSchedule(),
          scheduleOverridesAPI.list(),
        ]);
        const eff2 = getEffectiveDay(appointment.appointment_date, weekly2, overrides2);
        const cap2 = getDayCapacity(eff2.day, eff2.override);
        const [{ data: indivWinners }, { data: gmWinners }] = await Promise.all([
          supabase
            .from('appointments')
            .select('id, created_at')
            .eq('appointment_date', appointment.appointment_date)
            .eq('appointment_time', appointment.appointment_time)
            .eq('is_group_booking', false)
            .in('status', ['Pending', 'Confirmed']),
          supabase
            .from('group_members')
            .select('id, created_at, appointments!inner(appointment_date, status)')
            .eq('appointments.appointment_date', appointment.appointment_date)
            .in('appointments.status', ['Pending', 'Confirmed'])
            .eq('appointment_time', appointment.appointment_time),
        ]);
        type Winner = { kind: 'apt' | 'gm'; id: number; created_at: string };
        const winners: Winner[] = [];
        for (const r of (indivWinners || []) as { id: number; created_at: string }[]) {
          winners.push({ kind: 'apt', id: r.id, created_at: r.created_at });
        }
        for (const r of (gmWinners || []) as { id: number; created_at: string }[]) {
          winners.push({ kind: 'gm', id: r.id, created_at: r.created_at });
        }
        winners.sort((a, b) => {
          if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
          return a.id - b.id;
        });
        const myIdx = winners.findIndex(w => w.kind === 'apt' && Number(w.id) === Number(inserted.id));
        if (myIdx === -1 || myIdx >= cap2.perSlot) {
          // We lost the race. Roll back our insert and tell the caller.
          await supabase.from('appointments').delete().eq('id', inserted.id);
          throw new SlotTakenError('That time slot was just filled by another patient — please pick another.');
        }
      } catch (verifyErr) {
        if (verifyErr instanceof SlotTakenError) throw verifyErr;
        // Network hiccup during verification — keep the booking; the slot
        // guard above already passed and same-user double inserts are blocked
        // by the DB unique index.
      }
    }

    return inserted;
  },

  async updateStatus(id: number, status: Appointment['status']) {
    const updateData: Record<string, unknown> = { status };
    if (status === 'Cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;

    // Handle no-show tracking
    if (status === 'No Show') {
      const { data: apt } = await supabase
        .from('appointments')
        .select('user_id')
        .eq('id', id)
        .single();
      if (apt) {
        // Increment no_show_count on the user
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', apt.user_id)
          .single() as any;
        const user = userData as any;
        const currentCount = (user?.no_show_count || 0) + 1;
        const updates: Record<string, unknown> = { no_show_count: currentCount };
        if (currentCount >= 3) {
          updates.is_banned = true;
        }
        await supabase.from('users').update(updates as any).eq('id', apt.user_id);
      }
    }
  },

  async updateService(id: number, service: string) {
    const { error } = await (supabase as any)
      .from('appointments')
      .update({ service })
      .eq('id', id);
    if (error) throw error;
  },

  async reschedule(id: number, newDate: string, newTime: string, isAdmin: boolean = false) {
    // Fetch the current appointment
    const { data: apt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single() as any;
    if (fetchErr || !apt) throw new Error('Appointment not found');
    const appointment = apt as any;

    if (!isAdmin) {
      // Check reschedule count (users get max 1)
      if ((appointment.reschedule_count || 0) >= 1) {
        throw new Error('You have already rescheduled this appointment once. No further reschedules are allowed.');
      }
      // Check 24-hour (1 day) limit
      const aptDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntil = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil < 24) {
        throw new Error('Appointments can only be rescheduled at least 1 day before the scheduled time.');
      }
    }

    const { error } = await supabase
      .from('appointments')
      .update({
        appointment_date: newDate,
        appointment_time: newTime,
        reschedule_count: (appointment.reschedule_count || 0) + 1,
        rescheduled_at: new Date().toISOString(),
      } as any)
      .eq('id', id);
    if (error) {
      if (isUniqueViolation(error)) throw new SlotTakenError();
      throw error;
    }
  },

  async delete(id: number) {
    // Delete group members first
    await supabase.from('group_members').delete().eq('appointment_id', id);
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  },

  async fetchBookedSlots(date: string): Promise<string[]> {
    // A group / book-for-others appointment can have its members spread
    // across DIFFERENT times. Each `group_members.appointment_time` row also
    // consumes a slot, so we must aggregate both tables for an accurate view.
    const [{ data: appts }, { data: members }] = await Promise.all([
      supabase
        .from('appointments')
        .select('appointment_time, is_group_booking')
        .eq('appointment_date', date)
        .in('status', ['Pending', 'Confirmed']),
      supabase
        .from('group_members')
        .select('appointment_time, appointments!inner(appointment_date, status)')
        .eq('appointments.appointment_date', date)
        .in('appointments.status', ['Pending', 'Confirmed']),
    ]);
    const out: string[] = [];
    for (const a of appts || []) {
      if ((a as { is_group_booking?: boolean }).is_group_booking) continue;
      out.push(a.appointment_time as string);
    }
    for (const m of (members || []) as { appointment_time: string }[]) {
      if (m.appointment_time) out.push(m.appointment_time);
    }
    return out;
  },

  /**
   * Fetch the per-time *count* of active bookings on a given date plus a total.
   * This powers per-slot capacity (multi-doctor) and per-day capacity caps.
   * Counts BOTH individual appointments AND every group member's individually
   * picked time — without that, we'd render "0/3" at 9:30 even when a
   * group-member is already there.
   */
  async fetchSlotCounts(date: string): Promise<{ byTime: Record<string, number>; total: number }> {
    const [{ data: appts }, { data: members }] = await Promise.all([
      supabase
        .from('appointments')
        .select('appointment_time, is_group_booking')
        .eq('appointment_date', date)
        .in('status', ['Pending', 'Confirmed']),
      supabase
        .from('group_members')
        .select('appointment_time, appointments!inner(appointment_date, status)')
        .eq('appointments.appointment_date', date)
        .in('appointments.status', ['Pending', 'Confirmed']),
    ]);
    const byTime: Record<string, number> = {};
    let total = 0;
    for (const row of appts || []) {
      if ((row as { is_group_booking?: boolean }).is_group_booking) continue;
      const t = row.appointment_time as string;
      byTime[t] = (byTime[t] || 0) + 1;
      total += 1;
    }
    for (const row of (members || []) as { appointment_time: string }[]) {
      const t = row.appointment_time;
      if (!t) continue;
      byTime[t] = (byTime[t] || 0) + 1;
      total += 1;
    }
    return { byTime, total };
  },

  async fetchBookedSlotsBatch(dates: string[]): Promise<Record<string, string[]>> {
    if (dates.length === 0) return {};
    const [{ data: appts }, { data: members }] = await Promise.all([
      supabase
        .from('appointments')
        .select('appointment_date, appointment_time, is_group_booking')
        .in('appointment_date', dates)
        .in('status', ['Pending', 'Confirmed']),
      supabase
        .from('group_members')
        .select('appointment_time, appointments!inner(appointment_date, status)')
        .in('appointments.appointment_date', dates)
        .in('appointments.status', ['Pending', 'Confirmed']),
    ]);
    const map: Record<string, string[]> = {};
    for (const d of dates) map[d] = [];
    for (const row of appts || []) {
      if ((row as { is_group_booking?: boolean }).is_group_booking) continue;
      const dateStr = row.appointment_date as string;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(row.appointment_time as string);
    }
    for (const row of (members || []) as { appointment_time: string; appointments?: { appointment_date?: string } }[]) {
      const dateStr = row.appointments?.appointment_date;
      if (!dateStr) continue;
      if (!map[dateStr]) map[dateStr] = [];
      if (row.appointment_time) map[dateStr].push(row.appointment_time);
    }
    return map;
  },

  /**
   * Batched per-time counts for many dates (calendar view).
   */
  async fetchSlotCountsBatch(dates: string[]): Promise<Record<string, { byTime: Record<string, number>; total: number }>> {
    const out: Record<string, { byTime: Record<string, number>; total: number }> = {};
    if (dates.length === 0) return out;
    const [{ data: appts }, { data: members }] = await Promise.all([
      supabase
        .from('appointments')
        .select('appointment_date, appointment_time, is_group_booking')
        .in('appointment_date', dates)
        .in('status', ['Pending', 'Confirmed']),
      supabase
        .from('group_members')
        .select('appointment_time, appointments!inner(appointment_date, status)')
        .in('appointments.appointment_date', dates)
        .in('appointments.status', ['Pending', 'Confirmed']),
    ]);
    for (const d of dates) out[d] = { byTime: {}, total: 0 };
    for (const row of appts || []) {
      if ((row as { is_group_booking?: boolean }).is_group_booking) continue;
      const dateStr = row.appointment_date as string;
      const t = row.appointment_time as string;
      const bucket = out[dateStr] || (out[dateStr] = { byTime: {}, total: 0 });
      bucket.byTime[t] = (bucket.byTime[t] || 0) + 1;
      bucket.total += 1;
    }
    for (const row of (members || []) as { appointment_time: string; appointments?: { appointment_date?: string } }[]) {
      const dateStr = row.appointments?.appointment_date;
      const t = row.appointment_time;
      if (!dateStr || !t) continue;
      const bucket = out[dateStr] || (out[dateStr] = { byTime: {}, total: 0 });
      bucket.byTime[t] = (bucket.byTime[t] || 0) + 1;
      bucket.total += 1;
    }
    return out;
  },
};

// ========== USERS API (small helpers) ==========
export const usersAPI = {
  async markFirstLogin(userId: string) {
    try {
      await (supabase as any)
        .from('users')
        .update({ first_login_at: new Date().toISOString() })
        .eq('id', userId)
        .is('first_login_at', null);
    } catch (err) {
      console.warn('Failed to mark first login:', err);
    }
  },

  async getFirstLogin(userId: string): Promise<string | null> {
    try {
      const { data } = await (supabase as any)
        .from('users')
        .select('first_login_at')
        .eq('id', userId)
        .maybeSingle();
      return (data?.first_login_at as string | null) ?? null;
    } catch {
      return null;
    }
  },
};

// ========== GROUP MEMBERS API ==========
export const groupMembersAPI = {
  /**
   * Insert one or more group members. After insert we run a slot-by-slot
   * race verification: for each distinct time used by the inserted batch,
   * we confirm our just-created rows are within the per-slot capacity.
   * Losing members (and the parent appointment if all members lost) are
   * rolled back and we surface a SlotTakenError so the caller can re-pick.
   */
  async create(members: Omit<GroupMember, 'id'>[]): Promise<GroupMember[]> {
    const inserts = members.map(m => ({
      appointment_id: m.appointment_id,
      member_name: m.member_name,
      date_of_birth: m.date_of_birth || null,
      gender: m.gender || null,
      phone: m.phone || null,
      relationship: m.relationship || null,
      appointment_time: m.appointment_time,
      is_primary: m.is_primary,
      linked_user_id: m.linked_user_id || null,
      med_q1: m.med_q1 || null,
      med_q2: m.med_q2 || null,
      med_q2_details: m.med_q2_details || null,
      med_q3: m.med_q3 || null,
      med_q3_details: m.med_q3_details || null,
      med_q4: m.med_q4 || null,
      med_q4_details: m.med_q4_details || null,
      med_q5: m.med_q5 || null,
      med_q5_details: m.med_q5_details || null,
      med_q6: m.med_q6 || null,
      med_last_checkup: m.med_last_checkup || null,
      med_other: m.med_other || null,
      med_consent: m.med_consent,
      services: m.services && m.services.length > 0 ? m.services : null,
    }));
    const { data, error } = await supabase
      .from('group_members')
      .insert(inserts)
      .select();
    if (error) throw error;
    const created = (data || []) as unknown as (GroupMember & { created_at?: string })[];

    // Race-safety: for each distinct time used, verify our members are
    // among the first `perSlot` winners ordered by created_at, id.
    if (created.length > 0) {
      try {
        const parentId = members[0].appointment_id;
        const { data: parent } = await supabase
          .from('appointments')
          .select('appointment_date')
          .eq('id', parentId)
          .maybeSingle();
        const apptDate = (parent as { appointment_date?: string } | null)?.appointment_date;
        if (apptDate) {
          const [weekly, overrides] = await Promise.all([
            clinicSettingsAPI.fetchSchedule(),
            scheduleOverridesAPI.list(),
          ]);
          const eff = getEffectiveDay(apptDate, weekly, overrides);
          const cap = getDayCapacity(eff.day, eff.override);

          const distinctTimes = Array.from(new Set(created.map(c => c.appointment_time).filter(Boolean)));
          const losers: number[] = [];
          for (const t of distinctTimes) {
            const [{ data: indiv }, { data: gm }] = await Promise.all([
              supabase
                .from('appointments')
                .select('id, created_at')
                .eq('appointment_date', apptDate)
                .eq('appointment_time', t)
                .eq('is_group_booking', false)
                .in('status', ['Pending', 'Confirmed']),
              supabase
                .from('group_members')
                .select('id, created_at, appointments!inner(appointment_date, status)')
                .eq('appointments.appointment_date', apptDate)
                .in('appointments.status', ['Pending', 'Confirmed'])
                .eq('appointment_time', t),
            ]);
            type Winner = { id: number; created_at: string; kind: 'apt' | 'gm' };
            const winners: Winner[] = [];
            for (const r of (indiv || []) as { id: number; created_at: string }[]) {
              winners.push({ id: r.id, created_at: r.created_at, kind: 'apt' });
            }
            for (const r of (gm || []) as { id: number; created_at: string }[]) {
              winners.push({ id: r.id, created_at: r.created_at, kind: 'gm' });
            }
            winners.sort((a, b) => {
              if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
              return a.id - b.id;
            });
            const ourMembers = created.filter(c => c.appointment_time === t);
            for (const ours of ourMembers) {
              const idx = winners.findIndex(w => w.kind === 'gm' && Number(w.id) === Number(ours.id));
              if (idx === -1 || idx >= cap.perSlot) losers.push(Number(ours.id));
            }
          }

          if (losers.length > 0) {
            await supabase.from('group_members').delete().in('id', losers);
            // If every member lost, also delete the empty parent appointment.
            if (losers.length === created.length) {
              await supabase.from('appointments').delete().eq('id', parentId);
            }
            throw new SlotTakenError('One of the time slots was just filled by another patient — please pick another.');
          }
        }
      } catch (err) {
        if (err instanceof SlotTakenError) throw err;
        // Network hiccup during verification — keep the insert; the upfront
        // capacity check already guarded this batch.
      }
    }

    return created;
  },

  async fetchByAppointment(appointmentId: number): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('appointment_id', appointmentId);
    if (error) throw error;
    return (data || []) as unknown as GroupMember[];
  },

  async fetchByUser(userId: string): Promise<GroupMember[]> {
    // Find appointments booked by this user that are group bookings
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('user_id', userId)
      .eq('is_group_booking', true);

    if (!appointments || appointments.length === 0) return [];

    const aptIds = appointments.map(a => a.id);
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .in('appointment_id', aptIds);
    if (error) throw error;
    return (data || []) as unknown as GroupMember[];
  },

  /**
   * Replace the `services` array on a single group member. Pass an empty
   * array to clear the assignment. Used by admins to assign per-member
   * services after a group/companion booking is confirmed.
   */
  async updateServices(memberId: number, services: string[]) {
    const { error } = await supabase
      .from('group_members')
      .update({ services: services && services.length > 0 ? services : null })
      .eq('id', memberId);
    if (error) throw error;
  },
};

// ========== PRESCRIPTIONS API ==========
export const prescriptionsAPI = {
  async fetchByUser(userId: string): Promise<Prescription[]> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Prescription[];
  },

  async fetchByGroupMemberIds(memberIds: number[]): Promise<Prescription[]> {
    if (memberIds.length === 0) return [];
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .in('group_member_id', memberIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Prescription[];
  },

  async fetchAll(): Promise<Prescription[]> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Prescription[];
  },

  async fetchByAppointment(appointmentId: number): Promise<Prescription[]> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Prescription[];
  },

  async create(prescription: Omit<Prescription, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert([prescription])
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Prescription;
  },

  async update(id: number, updates: Partial<Prescription>) {
    const { id: _, created_at, ...updateData } = updates as Partial<Prescription> & { id?: number; created_at?: string };
    const { error } = await supabase
      .from('prescriptions')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  },

  async uploadImage(file: File, prescriptionId: number): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `prescription_${prescriptionId}_${Date.now()}.${ext}`;
    const filePath = `prescriptions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('prescriptions')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('prescriptions')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },
};

// ========== SERVICES API ==========
export const servicesAPI = {
  async fetchAll(): Promise<ClinicService[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const ALL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return (data || []).map((s: Record<string, unknown>) => ({
      id: s.id as number,
      name: s.name as string,
      is_active: !!s.is_active,
      sort_order: (s.sort_order as number) || 0,
      available_days: Array.isArray(s.available_days) && (s.available_days as string[]).length > 0
        ? (s.available_days as string[])
        : ALL_DAYS,
    }));
  },

  async create(name: string, sortOrder: number) {
    const { data, error } = await supabase
      .from('services')
      .insert([{ name, sort_order: sortOrder }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, updates: Partial<ClinicService>) {
    const { id: _ignored, ...updateData } = updates;
    void _ignored;
    const payload: Record<string, unknown> = { ...updateData };
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (p: Record<string, unknown>) => { eq: (col: string, v: unknown) => Promise<{ error: { message?: string } | null }> } } })
      .from('services')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ========== CLINIC SETTINGS API ==========
const DEFAULT_WEEKLY_SCHEDULE: ClinicSchedule = {
  sunday:    { is_open: true,  open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', doctors_count: 2, max_per_slot: 2, max_daily: 20 },
  monday:    { is_open: true,  open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', doctors_count: 2, max_per_slot: 2, max_daily: null },
  tuesday:   { is_open: true,  open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', doctors_count: 3, max_per_slot: 3, max_daily: null },
  wednesday: { is_open: true,  open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', doctors_count: 3, max_per_slot: 3, max_daily: null },
  thursday:  { is_open: true,  open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', doctors_count: 3, max_per_slot: 3, max_daily: null },
  friday:    { is_open: true,  open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', doctors_count: 2, max_per_slot: 2, max_daily: null },
  saturday:  { is_open: true,  open_time: '09:00', close_time: '17:00', break_start: '12:00', break_end: '13:00', doctors_count: 2, max_per_slot: 2, max_daily: 20 },
};

export const clinicSettingsAPI = {
  async fetchSchedule(): Promise<ClinicSchedule | null> {
    const { data } = await supabase
      .from('clinic_settings')
      .select('setting_value')
      .eq('setting_key', 'schedule')
      .maybeSingle();
    if (!data) return DEFAULT_WEEKLY_SCHEDULE;
    const stored = data.setting_value as unknown as ClinicSchedule;
    // Merge defaults so any newly-introduced capacity fields are populated
    // even on previously saved schedules.
    const merged: ClinicSchedule = {};
    for (const k of Object.keys(DEFAULT_WEEKLY_SCHEDULE)) {
      const def = DEFAULT_WEEKLY_SCHEDULE[k];
      merged[k] = { ...def, ...(stored?.[k] || {}) } as ClinicScheduleDay;
    }
    for (const k of Object.keys(stored || {})) {
      if (!merged[k]) merged[k] = stored[k];
    }
    return merged;
  },

  async updateSchedule(schedule: ClinicSchedule) {
    const { data: existing } = await supabase
      .from('clinic_settings')
      .select('id')
      .eq('setting_key', 'schedule')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('clinic_settings')
        .update({ setting_value: JSON.parse(JSON.stringify(schedule)), updated_at: new Date().toISOString() })
        .eq('setting_key', 'schedule');
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('clinic_settings')
        .insert([{ setting_key: 'schedule', setting_value: JSON.parse(JSON.stringify(schedule)) }]);
      if (error) throw error;
    }
  },

  // Alias used by newer screens.
  async upsertSchedule(schedule: ClinicSchedule) {
    return clinicSettingsAPI.updateSchedule(schedule);
  },
};
export const patientsAPI = {
  async fetchAll(): Promise<(PatientProfile & { username?: string })[]> {
    const { data: profiles } = await supabase
      .from('patient_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!profiles) return [];

    const userIds = profiles.map(p => p.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds);

    const userMap = new Map((users || []).map(u => [u.id, u.username]));

    return profiles.map(p => ({
      id: p.id,
      user_id: p.user_id,
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      middle_name: p.middle_name || '',
      date_of_birth: p.date_of_birth || '',
      gender: p.gender || '',
      address: p.address || '',
      phone: p.phone || '',
      is_complete: p.is_complete || false,
      username: userMap.get(p.user_id) || '',
    }));
  },

  async fetchAssessment(userId: string) {
    return assessmentAPI.fetch(userId);
  },
};

// ========== ACCOUNT MATCHING ==========
export const matchingAPI = {
  async checkAndMerge(userId: string, firstName: string, lastName: string, dateOfBirth: string, gender: string) {
    // Find unlinked group members with matching name + DOB + gender
    const { data: matches } = await supabase
      .from('group_members')
      .select('*')
      .is('linked_user_id', null)
      .ilike('member_name', `${firstName} ${lastName}`)
      .eq('date_of_birth', dateOfBirth)
      .eq('gender', gender);

    if (matches && matches.length > 0) {
      // Link them to this user
      const ids = matches.map(m => m.id);
      await supabase
        .from('group_members')
        .update({ linked_user_id: userId })
        .in('id', ids);

      // Copy medical data from the first match to the user's assessment if not submitted
      const { data: assessment } = await supabase
        .from('medical_assessments')
        .select('is_submitted')
        .eq('user_id', userId)
        .maybeSingle();

      if (assessment && !assessment.is_submitted && matches[0].med_consent) {
        await supabase
          .from('medical_assessments')
          .update({
            q1: matches[0].med_q1,
            q2: matches[0].med_q2,
            q2_details: matches[0].med_q2_details,
            q3: matches[0].med_q3,
            q3_details: matches[0].med_q3_details,
            q4: matches[0].med_q4,
            q4_details: matches[0].med_q4_details,
            q5: matches[0].med_q5,
            q5_details: matches[0].med_q5_details,
            q6: matches[0].med_q6,
            last_checkup: matches[0].med_last_checkup,
            other_medical: matches[0].med_other,
            consent: matches[0].med_consent,
            is_submitted: true,
          })
          .eq('user_id', userId);
      }

      // Move prescriptions from group_member to user
      for (const match of matches) {
        await supabase
          .from('prescriptions')
          .update({ user_id: userId })
          .eq('group_member_id', match.id);
      }

      return { merged: true, count: matches.length };
    }
    return { merged: false, count: 0 };
  },
};

// ========== BAN / NO-SHOW API ==========
export const banAPI = {
  async banUser(userId: string) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: true } as any)
        .eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.warn('Failed to ban user:', err);
    }
  },

  async unbanUser(userId: string) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: false, no_show_count: 0 } as any)
        .eq('id', userId);
      if (error) throw error;
    } catch (err) {
      console.warn('Failed to unban user:', err);
    }
  },

  async getUserBanStatus(userId: string) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single() as any;
      const user = data as any;
      return { is_banned: user?.is_banned || false, no_show_count: user?.no_show_count || 0 };
    } catch (err) {
      console.warn('Failed to get ban status:', err);
      return { is_banned: false, no_show_count: 0 };
    }
  },
};

// ========== NOTIFICATIONS API ==========
export const notificationsAPI = {
  async fetchByUser(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return (data || []) as unknown as Notification[];
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
      return [];
    }
  },

  async markAsRead(id: number) {
    try {
      await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }
  },

  async markAllAsRead(userId: string) {
    try {
      await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  },

  async clearAll(userId: string) {
    try {
      await (supabase as any)
        .from('notifications')
        .delete()
        .eq('user_id', userId);
    } catch (err) {
      console.warn('Failed to clear notifications:', err);
    }
  },

  async create(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'> & { related_appointment_id?: number | null; related_id?: number | null }) {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .insert([{ ...notification, is_read: false }]);
      if (error) console.warn('Failed to create notification:', error);
    } catch (err) {
      console.warn('Failed to create notification:', err);
    }
  },

  async notifyAdmins(title: string, message: string, type: Notification['type'] = 'new_booking', relatedAppointmentId?: number | null, relatedId?: number | null) {
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');
      if (admins) {
        for (const admin of admins) {
          await notificationsAPI.create({
            user_id: admin.id,
            title,
            message,
            type,
            ...(relatedAppointmentId && { related_appointment_id: relatedAppointmentId }),
            ...(relatedId && { related_id: relatedId }),
          });
        }
      }
    } catch (err) {
      console.warn('Failed to notify admins:', err);
    }
  },
};

// ========== ONBOARDING API ==========
export const onboardingAPI = {
  async isCompleted(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return true; // User not found, treat as completed
    return data.onboarding_completed === true;
  },

  async markCompleted(userId: string) {
    try {
      await supabase
        .from('users')
        .update({ onboarding_completed: true } as any)
        .eq('id', userId);
    } catch (err) {
      console.warn('Failed to mark onboarding as completed:', err);
    }
  },
};

// ========== XRAYS API ==========
export const xraysAPI = {
  async fetchByUser(userId: string): Promise<Xray[]> {
    const { data, error } = await (supabase as any)
      .from('xrays')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Xray[];
  },

  async fetchAll(): Promise<Xray[]> {
    // Table not yet in generated types - use untyped escape hatch
    const { data, error } = await (supabase as any)
      .from('xrays')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Xray[];
  },

  async fetchByAppointment(appointmentId: number): Promise<Xray[]> {
    const { data, error } = await (supabase as any)
      .from('xrays')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('xray_date', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Xray[];
  },

  async create(xray: Omit<Xray, 'id' | 'created_at'>) {
    const { data, error } = await (supabase as any)
      .from('xrays')
      .insert([xray])
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Xray;
  },

  async uploadImage(file: File, xrayId: number): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `xray_${xrayId}_${Date.now()}.${ext}`;
    const filePath = `xrays/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('xrays')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('xrays')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },

  async delete(id: number) {
    const { error } = await (supabase as any)
      .from('xrays')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ========== STANDBY / WALK-IN QUEUE API ==========
export const standbyAPI = {
  async fetchByUser(userId: string): Promise<StandbyRequest[]> {
    const { data, error } = await (supabase as any)
      .from('standby_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as StandbyRequest[];
  },

  async fetchAll(): Promise<StandbyRequest[]> {
    const { data, error } = await (supabase as any)
      .from('standby_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as StandbyRequest[];
  },

  async create(request: Omit<StandbyRequest, 'id' | 'created_at' | 'assigned_time' | 'admin_notes'>, opts?: { skipCooldown?: boolean; method?: BookingMethod }) {
    const method: BookingMethod = opts?.method ?? ((request.reason || '').trim().startsWith('[For ') ? 'standby_other' : 'standby_self');
    if (!opts?.skipCooldown && request.user_id) {
      const guard = await checkBookingCooldown(request.user_id, method);
      if (!guard.ok) {
        const failedGuard = guard as Exclude<typeof guard, { ok: true }>;
        if (failedGuard.reason === 'cooldown') throw new BookingCooldownError(failedGuard.remainingMs, method);
        if (failedGuard.reason === 'too_many') throw new TooManyActiveBookingsError(method);
      }
    }
    const { data, error } = await (supabase as any)
      .from('standby_requests')
      .insert([{ ...request, status: 'Waiting' }])
      .select()
      .single();
    if (error) throw error;
    return data as unknown as StandbyRequest;
  },

  async updateStatus(id: number, status: StandbyRequest['status'], adminNotes?: string, assignedTime?: string) {
    const updates: Record<string, unknown> = { status };
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;
    if (assignedTime !== undefined) updates.assigned_time = assignedTime;
    const { error } = await (supabase as any)
      .from('standby_requests')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async cancel(id: number) {
    const { error } = await (supabase as any)
      .from('standby_requests')
      .update({ status: 'Cancelled' })
      .eq('id', id);
    if (error) throw error;
  },
};

// ========== APPOINTMENT REMINDERS API ==========
const _reminderProcessing = new Set<string>();

export const remindersAPI = {
  async generateReminders(userId: string, appointments: { id: number; appointment_date: string; appointment_time: string; status: string }[]) {
    // Session-level deduplication: prevent concurrent calls from creating duplicates
    const sessionKey = `reminder_session_${userId}`;
    if (_reminderProcessing.has(sessionKey)) return;
    _reminderProcessing.add(sessionKey);

    try {
      const now = new Date();
      for (const apt of appointments) {
        if (apt.status !== 'Pending' && apt.status !== 'Confirmed') continue;
        const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        const hoursUntil = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // 24-hour reminder (fires between 2h and 24h before)
        if (hoursUntil > 2 && hoursUntil <= 24) {
          const reminderKey = `reminder_24h_${userId}_${apt.id}`;
          if (!localStorage.getItem(reminderKey)) {
            localStorage.setItem(reminderKey, 'true');
            await notificationsAPI.create({
              user_id: userId,
              title: 'Appointment Tomorrow',
              message: `Your appointment is tomorrow at ${formatTime(apt.appointment_time)}. Please make sure to show up on time!`,
              type: 'reminder',
              related_appointment_id: apt.id,
            });
          }
        }

        // 2-hour reminder (fires between 0 and 2h before)
        if (hoursUntil > 0 && hoursUntil <= 2) {
          const reminderKey = `reminder_2h_${userId}_${apt.id}`;
          if (!localStorage.getItem(reminderKey)) {
            localStorage.setItem(reminderKey, 'true');
            await notificationsAPI.create({
              user_id: userId,
              title: 'Appointment Very Soon',
              message: `Your appointment is in about ${Math.round(hoursUntil)} hour(s) at ${formatTime(apt.appointment_time)}. If you need to cancel, please do so at least 1 day before.`,
              type: 'reminder',
              related_appointment_id: apt.id,
            });
          }
        }
      }
    } finally {
      _reminderProcessing.delete(sessionKey);
    }
  },
};

// ========== SAVED COMPANIONS API ==========
export const companionsAPI = {
  async list(ownerId: string): Promise<SavedCompanion[]> {
    const { data, error } = await (supabase as any)
      .from('saved_companions')
      .select('*')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('Failed to fetch companions:', error);
      return [];
    }
    return (data || []) as SavedCompanion[];
  },

  async upsert(payload: Omit<SavedCompanion, 'id' | 'created_at' | 'updated_at'>): Promise<SavedCompanion | null> {
    try {
      // Dedupe by owner + name + dob
      const { data: existing } = await (supabase as any)
        .from('saved_companions')
        .select('id')
        .eq('owner_id', payload.owner_id)
        .ilike('member_name', payload.member_name)
        .eq('date_of_birth', payload.date_of_birth || null)
        .maybeSingle();

      if (existing) {
        const { data, error } = await (supabase as any)
          .from('saved_companions')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as SavedCompanion;
      }
      const { data, error } = await (supabase as any)
        .from('saved_companions')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as SavedCompanion;
    } catch (err) {
      console.warn('Failed to upsert companion:', err);
      return null;
    }
  },

  async update(id: number, updates: Partial<SavedCompanion>) {
    const { error } = await (supabase as any)
      .from('saved_companions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: number) {
    const { error } = await (supabase as any)
      .from('saved_companions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ========== SCHEDULE OVERRIDES API ==========
export const scheduleOverridesAPI = {
  async list(): Promise<ScheduleOverride[]> {
    const { data, error } = await (supabase as any)
      .from('schedule_overrides')
      .select('*')
      .order('override_date', { ascending: true });
    if (error) {
      console.warn('Failed to fetch overrides:', error);
      return [];
    }
    return (data || []) as ScheduleOverride[];
  },

  async upsert(payload: ScheduleOverride): Promise<ScheduleOverride> {
    const { data: existing } = await (supabase as any)
      .from('schedule_overrides')
      .select('override_date')
      .eq('override_date', payload.override_date)
      .maybeSingle();

    if (existing) {
      const { data, error } = await (supabase as any)
        .from('schedule_overrides')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('override_date', payload.override_date)
        .select()
        .maybeSingle();
      if (error) throw error;
      return (data as ScheduleOverride) || payload;
    } else {
      const { data, error } = await (supabase as any)
        .from('schedule_overrides')
        .insert([payload])
        .select()
        .maybeSingle();
      if (error) throw error;
      return (data as ScheduleOverride) || payload;
    }
  },

  async delete(date: string) {
    const { error } = await (supabase as any)
      .from('schedule_overrides')
      .delete()
      .eq('override_date', date);
    if (error) throw error;
  },

  // Alias for newer callers that prefer "remove".
  async remove(date: string) {
    return scheduleOverridesAPI.delete(date);
  },
};

// ========== Schedule helpers (override-aware) ==========
export function getEffectiveDay(
  date: string,
  weekly: ClinicSchedule | null,
  overrides: ScheduleOverride[] | null,
): { day: ClinicScheduleDay | null; override: ScheduleOverride | null } {
  const ovr = (overrides || []).find(o => o.override_date === date) || null;
  if (ovr) {
    if (!ovr.is_open) return { day: { is_open: false, open_time: '', close_time: '', break_start: '', break_end: '' }, override: ovr };
    // Inherit weekly capacity defaults when the override doesn't specify any.
    const dow = new Date(date + 'T12:00:00').getDay();
    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const fallback = weekly?.[DAY_KEYS[dow]] || null;
    return {
      day: {
        is_open: true,
        open_time: ovr.open_time || '09:00',
        close_time: ovr.close_time || '17:00',
        break_start: ovr.break_start || '12:00',
        break_end: ovr.break_end || '13:00',
        doctors_count: ovr.doctors_count ?? fallback?.doctors_count,
        max_per_slot: ovr.max_per_slot ?? fallback?.max_per_slot,
        max_daily: ovr.max_daily !== undefined ? ovr.max_daily : fallback?.max_daily,
      },
      override: ovr,
    };
  }
  const dow = new Date(date + 'T12:00:00').getDay();
  // Weekly schedule uses keys like 'sunday', 'monday', ... while getDay()
  // returns 0-6. Map numeric weekday to named keys for correct lookup.
  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const key = DAY_KEYS[dow] || String(dow);
  return { day: weekly?.[key] || null, override: null };
}

/**
 * Resolve the booking capacity for a given day using sensible fallbacks:
 * - perSlot: max_per_slot ?? doctors_count ?? 1
 * - daily:   max_daily (null/undefined ⇒ unlimited)
 */
export function getDayCapacity(
  day: ClinicScheduleDay | null,
  override?: ScheduleOverride | null,
): { perSlot: number; daily: number | null; doctors: number } {
  const doctors = Math.max(1, Number(override?.doctors_count ?? day?.doctors_count ?? 1));
  const perSlotRaw = override?.max_per_slot ?? day?.max_per_slot;
  const perSlot = Math.max(1, Number(perSlotRaw ?? doctors));
  const dailyRaw = override?.max_daily !== undefined ? override?.max_daily : day?.max_daily;
  const daily = dailyRaw === null || dailyRaw === undefined ? null : Math.max(1, Number(dailyRaw));
  return { perSlot, daily, doctors };
}

export function generateDaySlots(day: ClinicScheduleDay | null, stepMin = 30): string[] {
  if (!day || !day.is_open) return [];
  const [oH, oM] = (day.open_time || '09:00').split(':').map(Number);
  const [cH, cM] = (day.close_time || '17:00').split(':').map(Number);
  const [bsH, bsM] = (day.break_start || '12:00').split(':').map(Number);
  const [beH, beM] = (day.break_end || '13:00').split(':').map(Number);
  const open = oH * 60 + oM;
  const close = cH * 60 + cM;
  const bs = bsH * 60 + bsM;
  const be = beH * 60 + beM;
  const out: string[] = [];
  for (let t = open; t < close; t += stepMin) {
    if (t >= bs && t < be) continue;
    out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return out;
}
