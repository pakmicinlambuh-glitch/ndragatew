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
      balance_history: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          mode: Database["public"]["Enums"]["app_env"]
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["app_env"]
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["app_env"]
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          message: string
          message_type: Database["public"]["Enums"]["chat_message_type"] | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message: string
          message_type?: Database["public"]["Enums"]["chat_message_type"] | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          message?: string
          message_type?: Database["public"]["Enums"]["chat_message_type"] | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          order_index: number | null
          target_role: string | null
          title: string | null
          type: Database["public"]["Enums"]["widget_type"]
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          order_index?: number | null
          target_role?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["widget_type"]
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          order_index?: number | null
          target_role?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["widget_type"]
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
          fee_above_threshold: number | null
          fee_below_threshold: number | null
          id: string
          is_active: boolean | null
          markup_fee_type: Database["public"]["Enums"]["fee_type"]
          markup_fee_value: number
          max_amount: number | null
          min_amount: number | null
          threshold_amount: number | null
          updated_at: string | null
        }
        Insert: {
          base_fee_type?: Database["public"]["Enums"]["fee_type"]
          base_fee_value?: number
          channel_code: string
          channel_name: string
          channel_type: string
          created_at?: string | null
          fee_above_threshold?: number | null
          fee_below_threshold?: number | null
          id?: string
          is_active?: boolean | null
          markup_fee_type?: Database["public"]["Enums"]["fee_type"]
          markup_fee_value?: number
          max_amount?: number | null
          min_amount?: number | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          base_fee_type?: Database["public"]["Enums"]["fee_type"]
          base_fee_value?: number
          channel_code?: string
          channel_name?: string
          channel_type?: string
          created_at?: string | null
          fee_above_threshold?: number | null
          fee_below_threshold?: number | null
          id?: string
          is_active?: boolean | null
          markup_fee_type?: Database["public"]["Enums"]["fee_type"]
          markup_fee_value?: number
          max_amount?: number | null
          min_amount?: number | null
          threshold_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      merchant_provider_access: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean
          is_default: boolean
          provider_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          is_default?: boolean
          provider_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          is_default?: boolean
          provider_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_provider_access_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_qris_requests: {
        Row: {
          business_address: string | null
          business_name: string
          business_type: string | null
          created_at: string | null
          id: string
          notes: string | null
          qris_nmid: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["merchant_request_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_address?: string | null
          business_name: string
          business_type?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          qris_nmid?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["merchant_request_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_address?: string | null
          business_name?: string
          business_type?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          qris_nmid?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["merchant_request_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_broadcast: boolean | null
          is_read: boolean | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean | null
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_broadcast?: boolean | null
          is_read?: boolean | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_providers: {
        Row: {
          adapter_type: string
          base_url: string | null
          code: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          mode: Database["public"]["Enums"]["provider_mode"]
          name: string
          server_label: string | null
          sort_order: number
          supports_qris: boolean
          supports_retail: boolean
          supports_va: boolean
          updated_at: string
        }
        Insert: {
          adapter_type?: string
          base_url?: string | null
          code: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: Database["public"]["Enums"]["provider_mode"]
          name: string
          server_label?: string | null
          sort_order?: number
          supports_qris?: boolean
          supports_retail?: boolean
          supports_va?: boolean
          updated_at?: string
        }
        Update: {
          adapter_type?: string
          base_url?: string | null
          code?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          mode?: Database["public"]["Enums"]["provider_mode"]
          name?: string
          server_label?: string | null
          sort_order?: number
          supports_qris?: boolean
          supports_retail?: boolean
          supports_va?: boolean
          updated_at?: string
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
          suspended_at: string | null
          suspended_reason: string | null
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
          suspended_at?: string | null
          suspended_reason?: string | null
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
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      provider_channels: {
        Row: {
          base_fee_type: Database["public"]["Enums"]["fee_type"]
          base_fee_value: number
          channel_code: string
          channel_name: string
          channel_type: string
          created_at: string
          id: string
          is_active: boolean
          max_amount: number
          min_amount: number
          provider_id: string
          updated_at: string
        }
        Insert: {
          base_fee_type?: Database["public"]["Enums"]["fee_type"]
          base_fee_value?: number
          channel_code: string
          channel_name: string
          channel_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          provider_id: string
          updated_at?: string
        }
        Update: {
          base_fee_type?: Database["public"]["Enums"]["fee_type"]
          base_fee_value?: number
          channel_code?: string
          channel_name?: string
          channel_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_channels_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_credentials: {
        Row: {
          api_key: string | null
          client_id: string | null
          created_at: string
          extra: Json
          id: string
          merchant_code: string | null
          private_key: string | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          client_id?: string | null
          created_at?: string
          extra?: Json
          id?: string
          merchant_code?: string | null
          private_key?: string | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          client_id?: string | null
          created_at?: string
          extra?: Json
          id?: string
          merchant_code?: string | null
          private_key?: string | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
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
          mode: Database["public"]["Enums"]["app_env"]
          paid_at: string | null
          partner_reference_no: string
          payment_code: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_url: string | null
          provider_id: string | null
          provider_payload: Json | null
          provider_reference: string | null
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
          mode?: Database["public"]["Enums"]["app_env"]
          paid_at?: string | null
          partner_reference_no: string
          payment_code?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_url?: string | null
          provider_id?: string | null
          provider_payload?: Json | null
          provider_reference?: string | null
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
          mode?: Database["public"]["Enums"]["app_env"]
          paid_at?: string | null
          partner_reference_no?: string
          payment_code?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_url?: string | null
          provider_id?: string | null
          provider_payload?: Json | null
          provider_reference?: string | null
          qr_content?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          va_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_settings: {
        Row: {
          active_mode: Database["public"]["Enums"]["app_env"]
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sandbox_api_key: string | null
          updated_at: string | null
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          active_mode?: Database["public"]["Enums"]["app_env"]
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sandbox_api_key?: string | null
          updated_at?: string | null
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          active_mode?: Database["public"]["Enums"]["app_env"]
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sandbox_api_key?: string | null
          updated_at?: string | null
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      user_balance: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          mode: Database["public"]["Enums"]["app_env"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["app_env"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["app_env"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_kyc: {
        Row: {
          business_address: string | null
          business_name: string | null
          business_photo_url: string | null
          business_type: string | null
          created_at: string | null
          id: string
          id_number: string | null
          id_photo_url: string | null
          id_type: string | null
          ktp_photo_url: string | null
          owner_address: string | null
          owner_name: string | null
          owner_nik: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_ktp_photo_url: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["kyc_status"] | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_address?: string | null
          business_name?: string | null
          business_photo_url?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string
          id_number?: string | null
          id_photo_url?: string | null
          id_type?: string | null
          ktp_photo_url?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_nik?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_ktp_photo_url?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_address?: string | null
          business_name?: string | null
          business_photo_url?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string
          id_number?: string | null
          id_photo_url?: string | null
          id_type?: string | null
          ktp_photo_url?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_nik?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_ktp_photo_url?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"] | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
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
      withdrawal_requests: {
        Row: {
          account_holder: string
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
          withdrawal_type: string
        }
        Insert: {
          account_holder: string
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          withdrawal_type: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          withdrawal_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_user_balance: {
        Args: {
          _amount: number
          _created_by?: string
          _description?: string
          _mode?: Database["public"]["Enums"]["app_env"]
          _reference_id?: string
          _type: string
          _user_id: string
        }
        Returns: boolean
      }
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
      is_user_suspended: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_env: "sandbox" | "live"
      app_role: "admin" | "user"
      chat_message_type: "text" | "image" | "file"
      fee_type: "fixed" | "percent"
      kyc_status: "pending" | "approved" | "rejected"
      merchant_request_status: "pending" | "approved" | "rejected"
      notification_type: "info" | "warning" | "success" | "error"
      payment_method: "qris" | "va" | "retail"
      provider_mode: "sandbox" | "live"
      transaction_status: "pending" | "paid" | "expired" | "failed"
      widget_type: "info_box" | "slide" | "banner" | "announcement"
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
      app_env: ["sandbox", "live"],
      app_role: ["admin", "user"],
      chat_message_type: ["text", "image", "file"],
      fee_type: ["fixed", "percent"],
      kyc_status: ["pending", "approved", "rejected"],
      merchant_request_status: ["pending", "approved", "rejected"],
      notification_type: ["info", "warning", "success", "error"],
      payment_method: ["qris", "va", "retail"],
      provider_mode: ["sandbox", "live"],
      transaction_status: ["pending", "paid", "expired", "failed"],
      widget_type: ["info_box", "slide", "banner", "announcement"],
    },
  },
} as const
