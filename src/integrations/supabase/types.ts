export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          cancelled_at: string | null
          contact: string | null
          created_at: string | null
          duration_min: number | null
          id: number
          is_group_booking: boolean | null
          notes: string | null
          patient_name: string
          status: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          cancelled_at?: string | null
          contact?: string | null
          created_at?: string | null
          duration_min?: number | null
          id?: never
          is_group_booking?: boolean | null
          notes?: string | null
          patient_name: string
          status?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          cancelled_at?: string | null
          contact?: string | null
          created_at?: string | null
          duration_min?: number | null
          id?: never
          is_group_booking?: boolean | null
          notes?: string | null
          patient_name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          id: number
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          id?: never
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          id?: never
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          appointment_id: number
          appointment_time: string
          created_at: string | null
          date_of_birth: string | null
          gender: string | null
          id: number
          is_primary: boolean | null
          linked_user_id: string | null
          med_consent: boolean | null
          med_last_checkup: string | null
          med_other: string | null
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
          member_name: string
          phone: string | null
          relationship: string | null
          services: string[] | null
        }
        Insert: {
          appointment_id: number
          appointment_time: string
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: never
          is_primary?: boolean | null
          linked_user_id?: string | null
          med_consent?: boolean | null
          med_last_checkup?: string | null
          med_other?: string | null
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
          member_name: string
          phone?: string | null
          relationship?: string | null
          services?: string[] | null
        }
        Update: {
          appointment_id?: number
          appointment_time?: string
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: never
          is_primary?: boolean | null
          linked_user_id?: string | null
          med_consent?: boolean | null
          med_last_checkup?: string | null
          med_other?: string | null
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
          member_name?: string
          phone?: string | null
          relationship?: string | null
          services?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_assessments: {
        Row: {
          consent: boolean | null
          created_at: string | null
          id: number
          is_submitted: boolean | null
          last_checkup: string | null
          other_medical: string | null
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
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consent?: boolean | null
          created_at?: string | null
          id?: never
          is_submitted?: boolean | null
          last_checkup?: string | null
          other_medical?: string | null
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
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consent?: boolean | null
          created_at?: string | null
          id?: never
          is_submitted?: boolean | null
          last_checkup?: string | null
          other_medical?: string | null
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
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string | null
          gender: string | null
          id: number
          is_complete: boolean | null
          last_name: string | null
          middle_name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          id?: never
          is_complete?: boolean | null
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          id?: never
          is_complete?: boolean | null
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: number | null
          created_at: string | null
          diagnosis: string | null
          group_member_id: number | null
          id: number
          image_url: string | null
          instructions: string | null
          medications: string
          prescribed_by: string
          prescription_date: string
          user_id: string
        }
        Insert: {
          appointment_id?: number | null
          created_at?: string | null
          diagnosis?: string | null
          group_member_id?: number | null
          id?: never
          image_url?: string | null
          instructions?: string | null
          medications: string
          prescribed_by: string
          prescription_date?: string
          user_id: string
        }
        Update: {
          appointment_id?: number | null
          created_at?: string | null
          diagnosis?: string | null
          group_member_id?: number | null
          id?: never
          image_url?: string | null
          instructions?: string | null
          medications?: string
          prescribed_by?: string
          prescription_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_group_member_id_fkey"
            columns: ["group_member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: never
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          country_code: string
          created_at: string | null
          id: string
          password_hash: string
          phone: string
          role: string
          updated_at: string | null
          username: string
        }
        Insert: {
          country_code?: string
          created_at?: string | null
          id?: string
          password_hash: string
          phone: string
          role?: string
          updated_at?: string | null
          username: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          id?: string
          password_hash?: string
          phone?: string
          role?: string
          updated_at?: string | null
          username?: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
