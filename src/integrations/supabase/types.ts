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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appeal_decisions: {
        Row: {
          admin_id: string | null
          appeal_id: string
          buyer_refund_amount: number | null
          created_at: string
          id: string
          is_mutual_agreement: boolean | null
          resolution: Database["public"]["Enums"]["appeal_resolution"]
          resolution_notes: string
          seller_payment_amount: number | null
        }
        Insert: {
          admin_id?: string | null
          appeal_id: string
          buyer_refund_amount?: number | null
          created_at?: string
          id?: string
          is_mutual_agreement?: boolean | null
          resolution: Database["public"]["Enums"]["appeal_resolution"]
          resolution_notes: string
          seller_payment_amount?: number | null
        }
        Update: {
          admin_id?: string | null
          appeal_id?: string
          buyer_refund_amount?: number | null
          created_at?: string
          id?: string
          is_mutual_agreement?: boolean | null
          resolution?: Database["public"]["Enums"]["appeal_resolution"]
          resolution_notes?: string
          seller_payment_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appeal_decisions_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_evidence: {
        Row: {
          appeal_id: string
          comment: string | null
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          appeal_id: string
          comment?: string | null
          created_at?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          appeal_id?: string
          comment?: string | null
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_evidence_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_messages: {
        Row: {
          appeal_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          appeal_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          appeal_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_messages_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_mutual_proposals: {
        Row: {
          appeal_id: string
          buyer_amount: number
          created_at: string
          id: string
          message: string | null
          proposer_id: string
          responded_at: string | null
          seller_amount: number
          status: string
        }
        Insert: {
          appeal_id: string
          buyer_amount: number
          created_at?: string
          id?: string
          message?: string | null
          proposer_id: string
          responded_at?: string | null
          seller_amount: number
          status?: string
        }
        Update: {
          appeal_id?: string
          buyer_amount?: number
          created_at?: string
          id?: string
          message?: string | null
          proposer_id?: string
          responded_at?: string | null
          seller_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_mutual_proposals_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeal_ratings: {
        Row: {
          appeal_id: string
          comment: string | null
          created_at: string
          id: string
          rater_id: string
          stars: number
        }
        Insert: {
          appeal_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rater_id: string
          stars: number
        }
        Update: {
          appeal_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rater_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "appeal_ratings_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      appeals: {
        Row: {
          created_at: string
          escalated_at: string | null
          id: string
          initiator_id: string
          negotiation_deadline: string | null
          reason: Database["public"]["Enums"]["appeal_reason"]
          reason_description: string | null
          status: Database["public"]["Enums"]["appeal_status"]
          transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalated_at?: string | null
          id?: string
          initiator_id: string
          negotiation_deadline?: string | null
          reason: Database["public"]["Enums"]["appeal_reason"]
          reason_description?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalated_at?: string | null
          id?: string
          initiator_id?: string
          negotiation_deadline?: string | null
          reason?: Database["public"]["Enums"]["appeal_reason"]
          reason_description?: string | null
          status?: Database["public"]["Enums"]["appeal_status"]
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          message: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_holder_name: string | null
          bank_holder_rut: string | null
          bank_name: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_verified: boolean | null
          phone: string | null
          reputation_score: number | null
          rut: string | null
          total_transactions: number | null
          updated_at: string | null
          verification_document_url: string | null
          verification_rejection_reason: string | null
          verification_selfie_url: string | null
          verification_status: string | null
          verification_submitted_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_holder_name?: string | null
          bank_holder_rut?: string | null
          bank_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_verified?: boolean | null
          phone?: string | null
          reputation_score?: number | null
          rut?: string | null
          total_transactions?: number | null
          updated_at?: string | null
          verification_document_url?: string | null
          verification_rejection_reason?: string | null
          verification_selfie_url?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_holder_name?: string | null
          bank_holder_rut?: string | null
          bank_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          reputation_score?: number | null
          rut?: string | null
          total_transactions?: number | null
          updated_at?: string | null
          verification_document_url?: string | null
          verification_rejection_reason?: string | null
          verification_selfie_url?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rated_id: string
          rater_id: string
          stars: number
          transaction_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_id: string
          rater_id: string
          stars: number
          transaction_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rated_id?: string
          rater_id?: string
          stars?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          carrier: string | null
          created_at: string | null
          id: string
          reason: string
          reason_description: string | null
          received_at: string | null
          requester_id: string
          shipped_at: string | null
          status: string | null
          tracking_number: string | null
          transaction_id: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reason_description?: string | null
          received_at?: string | null
          requester_id: string
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
          transaction_id: string
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reason_description?: string | null
          received_at?: string | null
          requester_id?: string
          shipped_at?: string | null
          status?: string | null
          tracking_number?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          appeal_status: Database["public"]["Enums"]["appeal_status"] | null
          buyer_id: string | null
          cancelled_at: string | null
          commission: number | null
          completed_at: string | null
          created_at: string | null
          deposited_at: string | null
          dispute_opened_at: string | null
          id: string
          invite_code: string | null
          product_description: string | null
          product_name: string
          sale_type: string | null
          seller_id: string
          shipped_at: string | null
          state: Database["public"]["Enums"]["transaction_state"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          appeal_status?: Database["public"]["Enums"]["appeal_status"] | null
          buyer_id?: string | null
          cancelled_at?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string | null
          deposited_at?: string | null
          dispute_opened_at?: string | null
          id?: string
          invite_code?: string | null
          product_description?: string | null
          product_name: string
          sale_type?: string | null
          seller_id: string
          shipped_at?: string | null
          state?: Database["public"]["Enums"]["transaction_state"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appeal_status?: Database["public"]["Enums"]["appeal_status"] | null
          buyer_id?: string | null
          cancelled_at?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string | null
          deposited_at?: string | null
          dispute_opened_at?: string | null
          id?: string
          invite_code?: string | null
          product_description?: string | null
          product_name?: string
          sale_type?: string | null
          seller_id?: string
          shipped_at?: string | null
          state?: Database["public"]["Enums"]["transaction_state"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      wallet_movements: {
        Row: {
          amount: number
          balance_after: number
          bank_account_number: string | null
          bank_account_type: string | null
          bank_holder_name: string | null
          bank_holder_rut: string | null
          bank_name: string | null
          created_at: string | null
          description: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          transaction_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_holder_name?: string | null
          bank_holder_rut?: string | null
          bank_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          transaction_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_holder_name?: string | null
          bank_holder_rut?: string | null
          bank_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          transaction_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_movements_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_movements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      appeal_reason:
        | "producto_no_llego"
        | "producto_diferente"
        | "danos_o_fallas"
        | "incumplimiento_acuerdo"
        | "otro"
      appeal_resolution:
        | "liberar_fondos_vendedor"
        | "reembolso_parcial"
        | "reembolso_total"
        | "solicitar_mas_evidencia"
      appeal_status:
        | "no_hay_apelacion"
        | "apelacion_abierta"
        | "en_negociacion"
        | "pendiente_intervencion_plataforma"
        | "en_revision_plataforma"
        | "resuelta_a_favor_comprador"
        | "resuelta_a_favor_vendedor"
        | "resuelta_parcial"
        | "cerrada"
      sale_type: "servicio" | "producto_persona" | "producto_envio"
      transaction_state:
        | "created"
        | "invited"
        | "awaiting_deposit"
        | "funds_secured"
        | "in_delivery"
        | "completed"
        | "cancelled"
        | "in_dispute"
        | "awaiting_buyer_review"
        | "return_requested"
        | "return_in_progress"
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
      app_role: ["admin", "moderator", "user"],
      appeal_reason: [
        "producto_no_llego",
        "producto_diferente",
        "danos_o_fallas",
        "incumplimiento_acuerdo",
        "otro",
      ],
      appeal_resolution: [
        "liberar_fondos_vendedor",
        "reembolso_parcial",
        "reembolso_total",
        "solicitar_mas_evidencia",
      ],
      appeal_status: [
        "no_hay_apelacion",
        "apelacion_abierta",
        "en_negociacion",
        "pendiente_intervencion_plataforma",
        "en_revision_plataforma",
        "resuelta_a_favor_comprador",
        "resuelta_a_favor_vendedor",
        "resuelta_parcial",
        "cerrada",
      ],
      sale_type: ["servicio", "producto_persona", "producto_envio"],
      transaction_state: [
        "created",
        "invited",
        "awaiting_deposit",
        "funds_secured",
        "in_delivery",
        "completed",
        "cancelled",
        "in_dispute",
        "awaiting_buyer_review",
        "return_requested",
        "return_in_progress",
      ],
    },
  },
} as const
