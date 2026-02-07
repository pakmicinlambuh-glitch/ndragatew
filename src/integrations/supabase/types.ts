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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_settings: {
        Row: {
          api_key: string
          callback_url: string | null
          created_at: string | null
          id: string
          is_validated: boolean | null
          merchant_code: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          callback_url?: string | null
          created_at?: string | null
          id?: string
          is_validated?: boolean | null
          merchant_code: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          callback_url?: string | null
          created_at?: string | null
          id?: string
          is_validated?: boolean | null
          merchant_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fee_settings: {
        Row: {
          base_fee_type: Database["public"]["Enums"]["fee_type"]
          base_fee_value: number
          channel_code: string
          channel_name: string
          channel_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          markup_fee_type: Database["public"]["Enums"]["fee_type"]
          markup_fee_value: number
          max_amount: number | null
          min_amount: number | null
          updated_at: string | null
        }
        Insert: {
          base_fee_type?: Database["public"]["Enums"]["fee_type"]
          base_fee_value?: number
          channel_code: string
          channel_name: string
          channel_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_fee_type?: Database["public"]["Enums"]["fee_type"]
          markup_fee_value?: number
          max_amount?: number | null
          min_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          base_fee_type?: Database["public"]["Enums"]["fee_type"]
          base_fee_value?: number
          channel_code?: string
          channel_name?: string
          channel_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_fee_type?: Database["public"]["Enums"]["fee_type"]
          markup_fee_value?: number
          max_amount?: number | null
          min_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_fee: number | null
          amount: number
          callback_data: Json | null
          channel_code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          paid_at: string | null
          partner_reference_no: string
          payment_code: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_url: string | null
          qr_content: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
          va_number: string | null
        }
        Insert: {
          admin_fee?: number | null
          amount: number
          callback_data?: Json | null
          channel_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          paid_at?: string | null
          partner_reference_no: string
          payment_code?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_url?: string | null
          qr_content?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
          va_number?: string | null
        }
        Update: {
          admin_fee?: number | null
          amount?: number
          callback_data?: Json | null
          channel_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          paid_at?: string | null
          partner_reference_no?: string
          payment_code?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_url?: string | null
          qr_content?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          va_number?: string | null
        }
        Relationships: []
      }
      user_api_settings: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      fee_type: "fixed" | "percent"
      payment_method: "qris" | "va" | "retail"
      transaction_status: "pending" | "paid" | "expired" | "failed"
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
    Enums: {
      app_role: ["admin", "user"],
      fee_type: ["fixed", "percent"],
      payment_method: ["qris", "va", "retail"],
      transaction_status: ["pending", "paid", "expired", "failed"],
    },
  },
} as const
