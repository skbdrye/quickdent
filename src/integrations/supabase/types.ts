// Supabase database types — hand-written to match the user's actual
// QuickDent schema on https://silekfssubwfhsxakobw.supabase.co.
// Re-generate with `supabase gen types typescript --project-id silekfssubwfhsxakobw`
// after schema changes.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          phone: string
          password_hash: string
          country_code: string
          role: string
          created_at: string | null
          updated_at: string | null
          no_show_count: number | null
          is_banned: boolean | null
          banned_at: string | null
          ban_reason: string | null
          onboarding_completed: boolean | null
          first_login_at: string | null
        }
        Insert: {
          id?: string
          username: string
          phone: string
          password_hash: string
          country_code?: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
          no_show_count?: number | null
          is_banned?: boolean | null
          banned_at?: string | null
          ban_reason?: string | null
          onboarding_completed?: boolean | null
          first_login_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          phone?: string
          password_hash?: string
          country_code?: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
          no_show_count?: number | null
          is_banned?: boolean | null
          banned_at?: string | null
          ban_reason?: string | null
          onboarding_completed?: boolean | null
          first_login_at?: string | null
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          id: number
          user_id: string
          first_name: string | null
          last_name: string | null
          middle_name: string | null
          date_of_birth: string | null
          gender: string | null
          phone: string | null
          address: string | null
          is_complete: boolean | null
          created_at: string | null
          updated_at: string | null
          patient_kind: string | null
          patient_type: string | null
        }
        Insert: {
          id?: number
          user_id: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          date_of_birth?: string | null
          gender?: string | null
          phone?: string | null
          address?: string | null
          is_complete?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          patient_kind?: string | null
          patient_type?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          middle_name?: string | null
          date_of_birth?: string | null
          gender?: string | null
          phone?: string | null
          address?: string | null
          is_complete?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          patient_kind?: string | null
          patient_type?: string | null
        }
        Relationships: []
      }
      medical_assessments: {
        Row: {
          id: number
          user_id: string
          q1: string | null
          q2: string | null
          q2_details: string | null
          q3: string | null
          q3_details: string | null
          q4: string | null
          q4_details: string | null
          q5: string | null
          q5_details: string | null
          q6: string | null
          last_checkup: string | null
          other_medical: string | null
          consent: boolean | null
          is_submitted: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          q1?: string | null
          q2?: string | null
          q2_details?: string | null
          q3?: string | null
          q3_details?: string | null
          q4?: string | null
          q4_details?: string | null
          q5?: string | null
          q5_details?: string | null
          q6?: string | null
          last_checkup?: string | null
          other_medical?: string | null
          consent?: boolean | null
          is_submitted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          q1?: string | null
          q2?: string | null
          q2_details?: string | null
          q3?: string | null
          q3_details?: string | null
          q4?: string | null
          q4_details?: string | null
          q5?: string | null
          q5_details?: string | null
          q6?: string | null
          last_checkup?: string | null
          other_medical?: string | null
          consent?: boolean | null
          is_submitted?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: number
          user_id: string
          patient_name: string
          appointment_date: string
          appointment_time: string
          duration_min: number | null
          notes: string | null
          status: string | null
          contact: string | null
          is_group_booking: boolean | null
          created_at: string | null
          cancelled_at: string | null
          reschedule_count: number | null
          rescheduled_at: string | null
          original_date: string | null
          original_time: string | null
          service: string | null
        }
        Insert: {
          id?: number
          user_id: string
          patient_name: string
          appointment_date: string
          appointment_time: string
          duration_min?: number | null
          notes?: string | null
          status?: string | null
          contact?: string | null
          is_group_booking?: boolean | null
          created_at?: string | null
          cancelled_at?: string | null
          reschedule_count?: number | null
          rescheduled_at?: string | null
          original_date?: string | null
          original_time?: string | null
          service?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          patient_name?: string
          appointment_date?: string
          appointment_time?: string
          duration_min?: number | null
          notes?: string | null
          status?: string | null
          contact?: string | null
          is_group_booking?: boolean | null
          created_at?: string | null
          cancelled_at?: string | null
          reschedule_count?: number | null
          rescheduled_at?: string | null
          original_date?: string | null
          original_time?: string | null
          service?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: number
          appointment_id: number
          member_name: string
          date_of_birth: string | null
          relationship: string | null
          services: string[] | null
          appointment_time: string
          phone: string | null
          med_q1: string | null
          med_q2: string | null
          med_q2_details: string | null
          med_q3: string | null
          med_q3_details: string | null
          med_q4: string | null
          med_q4_details: string | null
          med_q5: string | null
          med_q5_details: string | null
          med_q6: string | null
          med_last_checkup: string | null
          med_other: string | null
          med_consent: boolean | null
          is_primary: boolean | null
          created_at: string | null
          linked_user_id: string | null
          gender: string | null
        }
        Insert: {
          id?: number
          appointment_id: number
          member_name: string
          date_of_birth?: string | null
          relationship?: string | null
          services?: string[] | null
          appointment_time: string
          phone?: string | null
          med_q1?: string | null
          med_q2?: string | null
          med_q2_details?: string | null
          med_q3?: string | null
          med_q3_details?: string | null
          med_q4?: string | null
          med_q4_details?: string | null
          med_q5?: string | null
          med_q5_details?: string | null
          med_q6?: string | null
          med_last_checkup?: string | null
          med_other?: string | null
          med_consent?: boolean | null
          is_primary?: boolean | null
          created_at?: string | null
          linked_user_id?: string | null
          gender?: string | null
        }
        Update: {
          id?: number
          appointment_id?: number
          member_name?: string
          date_of_birth?: string | null
          relationship?: string | null
          services?: string[] | null
          appointment_time?: string
          phone?: string | null
          med_q1?: string | null
          med_q2?: string | null
          med_q2_details?: string | null
          med_q3?: string | null
          med_q3_details?: string | null
          med_q4?: string | null
          med_q4_details?: string | null
          med_q5?: string | null
          med_q5_details?: string | null
          med_q6?: string | null
          med_last_checkup?: string | null
          med_other?: string | null
          med_consent?: boolean | null
          is_primary?: boolean | null
          created_at?: string | null
          linked_user_id?: string | null
          gender?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean | null
          related_appointment_id: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          title: string
          message: string
          type?: string
          is_read?: boolean | null
          related_appointment_id?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean | null
          related_appointment_id?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          id: number
          name: string
          is_active: boolean | null
          sort_order: number | null
          created_at: string | null
          available_days: string[]
        }
        Insert: {
          id?: number
          name: string
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          available_days?: string[]
        }
        Update: {
          id?: number
          name?: string
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          available_days?: string[]
        }
        Relationships: []
      }
      service_day_availability: {
        Row: {
          service_id: number
          weekday: number
          is_available: boolean
        }
        Insert: {
          service_id: number
          weekday: number
          is_available?: boolean
        }
        Update: {
          service_id?: number
          weekday?: number
          is_available?: boolean
        }
        Relationships: []
      }
      day_capacity: {
        Row: {
          weekday: number
          doctor_count: number
          slot_capacity: number
          day_max_bookings: number | null
        }
        Insert: {
          weekday: number
          doctor_count?: number
          slot_capacity?: number
          day_max_bookings?: number | null
        }
        Update: {
          weekday?: number
          doctor_count?: number
          slot_capacity?: number
          day_max_bookings?: number | null
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          id: number
          appointment_id: number | null
          user_id: string
          prescribed_by: string
          prescription_date: string
          medications: string
          diagnosis: string | null
          instructions: string | null
          created_at: string | null
          group_member_id: number | null
          image_url: string | null
          images: string[] | null
        }
        Insert: {
          id?: number
          appointment_id?: number | null
          user_id: string
          prescribed_by: string
          prescription_date?: string
          medications: string
          diagnosis?: string | null
          instructions?: string | null
          created_at?: string | null
          group_member_id?: number | null
          image_url?: string | null
          images?: string[] | null
        }
        Update: {
          id?: number
          appointment_id?: number | null
          user_id?: string
          prescribed_by?: string
          prescription_date?: string
          medications?: string
          diagnosis?: string | null
          instructions?: string | null
          created_at?: string | null
          group_member_id?: number | null
          image_url?: string | null
          images?: string[] | null
        }
        Relationships: []
      }
      xrays: {
        Row: {
          id: number
          user_id: string
          appointment_id: number | null
          group_member_id: number | null
          uploaded_by: string
          image_url: string
          notes: string | null
          xray_date: string
          created_at: string | null
          images: string[] | null
        }
        Insert: {
          id?: number
          user_id: string
          appointment_id?: number | null
          group_member_id?: number | null
          uploaded_by?: string
          image_url: string
          notes?: string | null
          xray_date?: string
          created_at?: string | null
          images?: string[] | null
        }
        Update: {
          id?: number
          user_id?: string
          appointment_id?: number | null
          group_member_id?: number | null
          uploaded_by?: string
          image_url?: string
          notes?: string | null
          xray_date?: string
          created_at?: string | null
          images?: string[] | null
        }
        Relationships: []
      }
      standby_requests: {
        Row: {
          id: number
          user_id: string
          patient_name: string
          contact: string | null
          preferred_date: string
          reason: string
          status: string
          assigned_time: string | null
          admin_notes: string | null
          created_at: string | null
          date_of_birth: string | null
          med_q1: string | null
          med_q2: string | null
          med_q2_details: string | null
          med_q3: string | null
          med_q3_details: string | null
          med_q4: string | null
          med_q4_details: string | null
          med_q5: string | null
          med_q5_details: string | null
          med_q6: string | null
          med_last_checkup: string | null
          med_other: string | null
          med_consent: boolean | null
          saved_companion_id: number | null
        }
        Insert: {
          id?: number
          user_id: string
          patient_name: string
          contact?: string | null
          preferred_date: string
          reason: string
          status?: string
          assigned_time?: string | null
          admin_notes?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          med_q1?: string | null
          med_q2?: string | null
          med_q2_details?: string | null
          med_q3?: string | null
          med_q3_details?: string | null
          med_q4?: string | null
          med_q4_details?: string | null
          med_q5?: string | null
          med_q5_details?: string | null
          med_q6?: string | null
          med_last_checkup?: string | null
          med_other?: string | null
          med_consent?: boolean | null
          saved_companion_id?: number | null
        }
        Update: {
          id?: number
          user_id?: string
          patient_name?: string
          contact?: string | null
          preferred_date?: string
          reason?: string
          status?: string
          assigned_time?: string | null
          admin_notes?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          med_q1?: string | null
          med_q2?: string | null
          med_q2_details?: string | null
          med_q3?: string | null
          med_q3_details?: string | null
          med_q4?: string | null
          med_q4_details?: string | null
          med_q5?: string | null
          med_q5_details?: string | null
          med_q6?: string | null
          med_last_checkup?: string | null
          med_other?: string | null
          med_consent?: boolean | null
          saved_companion_id?: number | null
        }
        Relationships: []
      }
      saved_companions: {
        Row: {
          id: number
          owner_id: string
          member_name: string
          date_of_birth: string | null
          gender: string | null
          phone: string | null
          relationship: string | null
          med_q1: string | null
          med_q2: string | null
          med_q2_details: string | null
          med_q3: string | null
          med_q3_details: string | null
          med_q4: string | null
          med_q4_details: string | null
          med_q5: string | null
          med_q5_details: string | null
          med_q6: string | null
          med_last_checkup: string | null
          med_other: string | null
          med_consent: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          owner_id: string
          member_name: string
          date_of_birth?: string | null
          gender?: string | null
          phone?: string | null
          relationship?: string | null
          med_q1?: string | null
          med_q2?: string | null
          med_q2_details?: string | null
          med_q3?: string | null
          med_q3_details?: string | null
          med_q4?: string | null
          med_q4_details?: string | null
          med_q5?: string | null
          med_q5_details?: string | null
          med_q6?: string | null
          med_last_checkup?: string | null
          med_other?: string | null
          med_consent?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          owner_id?: string
          member_name?: string
          date_of_birth?: string | null
          gender?: string | null
          phone?: string | null
          relationship?: string | null
          med_q1?: string | null
          med_q2?: string | null
          med_q2_details?: string | null
          med_q3?: string | null
          med_q3_details?: string | null
          med_q4?: string | null
          med_q4_details?: string | null
          med_q5?: string | null
          med_q5_details?: string | null
          med_q6?: string | null
          med_last_checkup?: string | null
          med_other?: string | null
          med_consent?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_overrides: {
        Row: {
          override_date: string
          is_open: boolean
          open_time: string | null
          close_time: string | null
          break_start: string | null
          break_end: string | null
          reason: string | null
          created_at: string | null
          doctor_count: number | null
          slot_capacity: number | null
          day_max_bookings: number | null
          doctors_count: number | null
          max_per_slot: number | null
          max_daily: number | null
        }
        Insert: {
          override_date: string
          is_open?: boolean
          open_time?: string | null
          close_time?: string | null
          break_start?: string | null
          break_end?: string | null
          reason?: string | null
          created_at?: string | null
          doctor_count?: number | null
          slot_capacity?: number | null
          day_max_bookings?: number | null
          doctors_count?: number | null
          max_per_slot?: number | null
          max_daily?: number | null
        }
        Update: {
          override_date?: string
          is_open?: boolean
          open_time?: string | null
          close_time?: string | null
          break_start?: string | null
          break_end?: string | null
          reason?: string | null
          created_at?: string | null
          doctor_count?: number | null
          slot_capacity?: number | null
          day_max_bookings?: number | null
          doctors_count?: number | null
          max_per_slot?: number | null
          max_daily?: number | null
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          id: number
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          id?: number
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          id?: number
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          id: number
          phone: string
          purpose: string
          code_hash: string
          expires_at: string
          consumed_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          phone: string
          purpose?: string
          code_hash: string
          expires_at: string
          consumed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          phone?: string
          purpose?: string
          code_hash?: string
          expires_at?: string
          consumed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
