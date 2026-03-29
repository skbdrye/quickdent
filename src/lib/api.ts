/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';
import type { User, Appointment, PatientProfile, MedicalAssessment, Prescription, ClinicService, ClinicSchedule, GroupMember, Notification } from './types';
import { formatPhoneWithCountry, normalizePhoneForLogin } from './countries';
import bcryptjs from 'bcryptjs';

// ========== AUTH API ==========
export const authAPI = {
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

      // Create onboarding setting for new user (not completed yet)
      await (supabase as any).from('user_settings').insert([{
        user_id: newUser.id,
        setting_key: 'onboarding_completed',
        setting_value: false,
      }]);


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
    }));
  },

  async create(appointment: Omit<Appointment, 'id' | 'created_at' | 'cancelled_at' | 'group_members'>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        user_id: appointment.user_id,
        patient_name: appointment.patient_name,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        duration_min: appointment.duration_min,
        notes: appointment.notes,
        contact: appointment.contact,
        status: appointment.status || 'Pending',
        is_group_booking: appointment.is_group_booking,
      }])
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Appointment;
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
      // Check 1-hour limit
      const aptDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntil = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil < 1) {
        throw new Error('Appointments can only be rescheduled at least 1 hour before the scheduled time.');
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
    if (error) throw error;
  },

  async delete(id: number) {
    // Delete group members first
    await supabase.from('group_members').delete().eq('appointment_id', id);
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  },

  async fetchBookedSlots(date: string): Promise<string[]> {
    const { data } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('appointment_date', date)
      .in('status', ['Pending', 'Confirmed']);
    return (data || []).map(a => a.appointment_time);
  },
};

// ========== GROUP MEMBERS API ==========
export const groupMembersAPI = {
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
    }));
    const { data, error } = await supabase
      .from('group_members')
      .insert(inserts)
      .select();
    if (error) throw error;
    return data as unknown as GroupMember[];
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
    return (data || []) as unknown as ClinicService[];
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
    const { id: _, ...updateData } = updates;
    const { error } = await supabase
      .from('services')
      .update(updateData)
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
export const clinicSettingsAPI = {
  async fetchSchedule(): Promise<ClinicSchedule | null> {
    const { data } = await supabase
      .from('clinic_settings')
      .select('setting_value')
      .eq('setting_key', 'schedule')
      .maybeSingle();
    if (!data) return null;
    return data.setting_value as unknown as ClinicSchedule;
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
};

// ========== PATIENT PROFILES API (Admin) ==========
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

  async create(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'> & { related_appointment_id?: number | null }) {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .insert([{ ...notification, is_read: false }]);
      if (error) console.warn('Failed to create notification:', error);
    } catch (err) {
      console.warn('Failed to create notification:', err);
    }
  },

  async notifyAdmins(title: string, message: string, type: Notification['type'] = 'new_booking', relatedAppointmentId?: number | null) {
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
    const { data, error } = await (supabase as any)
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', 'onboarding_completed')
      .maybeSingle();
    if (error) throw error;
    // If no row exists, this is an old user who registered before onboarding was added -> treat as completed
    if (!data) return true;
    const result = data as any;
    return result?.setting_value === true || result?.setting_value === 'true';
  },

  async markCompleted(userId: string) {
    try {
      const { data: existing } = await (supabase as any)
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .eq('setting_key', 'onboarding_completed')
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from('user_settings')
          .update({ setting_value: true, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await (supabase as any)
          .from('user_settings')
          .insert([{
            user_id: userId,
            setting_key: 'onboarding_completed',
            setting_value: true,
          }]);
      }
    } catch (err) {
      console.warn('Failed to mark onboarding as completed:', err);
    }
  },
};

// ========== APPOINTMENT REMINDERS API ==========
export const remindersAPI = {
  async generateReminders(userId: string, appointments: { id: number; appointment_date: string; appointment_time: string; status: string }[]) {
    const now = new Date();
    for (const apt of appointments) {
      if (apt.status !== 'Pending' && apt.status !== 'Confirmed') continue;
      const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
      const hoursUntil = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntil > 0 && hoursUntil <= 24 && hoursUntil > 2) {
        // 24-hour reminder
        const reminderKey = `reminder_24h_${apt.id}`;
        const { data: existing } = await (supabase as any)
          .from('user_settings')
          .select('id')
          .eq('user_id', userId)
          .eq('setting_key', reminderKey)
          .maybeSingle();
        if (!existing) {
          await notificationsAPI.create({
            user_id: userId,
            title: 'Appointment Tomorrow',
            message: `Your appointment is tomorrow at ${apt.appointment_time}. Please make sure to show up on time!`,
            type: 'reminder',
            related_appointment_id: apt.id,
          });
          await (supabase as any).from('user_settings').insert([{ user_id: userId, setting_key: reminderKey, setting_value: true }]);
        }
      }

      if (hoursUntil > 0 && hoursUntil <= 2) {
        // 2-hour reminder
        const reminderKey = `reminder_2h_${apt.id}`;
        const { data: existing } = await (supabase as any)
          .from('user_settings')
          .select('id')
          .eq('user_id', userId)
          .eq('setting_key', reminderKey)
          .maybeSingle();
        if (!existing) {
          await notificationsAPI.create({
            user_id: userId,
            title: 'Appointment Very Soon',
            message: `Your appointment is in about ${Math.round(hoursUntil)} hour(s) at ${apt.appointment_time}. If you need to cancel, please do so at least 1 hour before. You may also reschedule if you haven't already.`,
            type: 'reminder',
            related_appointment_id: apt.id,
          });
          await (supabase as any).from('user_settings').insert([{ user_id: userId, setting_key: reminderKey, setting_value: true }]);
        }
      }
    }
  },
};
