import { supabase } from './supabase';
import type { User, Appointment, PatientProfile, MedicalAssessment } from './types';
import { formatPhoneWithCountry } from './countries';
import bcryptjs from 'bcryptjs';

// ========== AUTH API - CUSTOM DATABASE AUTHENTICATION ==========
export const authAPI = {
  async register(username: string, phone: string, countryCode: string, password: string) {
    try {
      // Format full phone with country code
      const fullPhone = formatPhoneWithCountry(countryCode, phone);

      // Check if username already exists
      const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUsername) {
        return { success: false, message: 'Username already taken. Please choose a different username.' };
      }

      // Check if phone already exists
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', fullPhone)
        .single();

      if (existingPhone) {
        return { success: false, message: 'This phone number is already registered. Please use a different phone number.' };
      }

      // Hash password
      const hashedPassword = await bcryptjs.hash(password, 10);

      // Create user in database
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username: username,
            phone: fullPhone,
            password_hash: hashedPassword,
            country_code: countryCode,
            role: 'user',
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Registration insert error:', insertError);
        return { success: false, message: 'Registration failed. Please try again.' };
      }

      return { success: true, message: 'Registration successful. You can now login with your phone number.' };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  },

  async login(phoneOrUsername: string, password: string) {
    try {
      // Try to find user by username first, then by phone if not found
      let user;

      if (phoneOrUsername.startsWith('+')) {
        // Search by phone number
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('phone', phoneOrUsername)
          .single();

        if (error || !data) {
          return { success: false, message: 'Invalid phone number or password' };
        }
        user = data;
      } else {
        // Search by username
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', phoneOrUsername)
          .single();

        if (error || !data) {
          return { success: false, message: 'Invalid username or password' };
        }
        user = data;
      }

      // Compare password with hash
      const passwordMatch = await bcryptjs.compare(password, user.password_hash);
      if (!passwordMatch) {
        return { success: false, message: 'Invalid username/phone or password' };
      }

      // Remove password hash before returning
      const { password_hash, ...userWithoutPassword } = user;
      return { success: true, message: 'Login successful', user: userWithoutPassword };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  },

  async adminLogin(usernameOrPhone: string, password: string) {
    try {
      // Find admin by username or phone
      let admin;

      if (usernameOrPhone.startsWith('+')) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('phone', usernameOrPhone)
          .eq('role', 'admin')
          .single();
        admin = data;
      } else {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('username', usernameOrPhone)
          .eq('role', 'admin')
          .single();
        admin = data;
      }

      if (!admin) {
        return { success: false, message: 'Invalid admin credentials' };
      }

      // Compare password
      const passwordMatch = await bcryptjs.compare(password, admin.password_hash);
      if (!passwordMatch) {
        return { success: false, message: 'Invalid admin credentials' };
      }

      // Remove password hash before returning
      const { password_hash, ...adminWithoutPassword } = admin;
      return { success: true, message: 'Admin login successful', user: adminWithoutPassword };
    } catch (error: any) {
      console.error('Admin login error:', error);
      return { success: false, message: error.message || 'Admin login failed' };
    }
  },

  async logout() {
    await supabase.auth.signOut();
  },
};

// ========== APPOINTMENTS API ==========
export const appointmentsAPI = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Appointment[];
  },

  async create(appointment: Omit<Appointment, 'id' | 'status' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...appointment, status: 'Pending', created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async updateStatus(id: number, status: Appointment['status']) {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
