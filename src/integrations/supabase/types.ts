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
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean
          published_at: string | null
          reading_minutes: number | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      meeting_proposals: {
        Row: {
          created_at: string
          id: string
          message: string | null
          proposed_datetime: string
          proposed_location: string
          proposer_id: string
          responded_at: string | null
          status: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          proposed_datetime: string
          proposed_location: string
          proposer_id: string
          responded_at?: string | null
          status?: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          proposed_datetime?: string
          proposed_location?: string
          proposer_id?: string
          responded_at?: string | null
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_proposals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
          dashboard_background_url: string | null
          dashboard_color: string | null
          dashboard_theme: string | null
          email: string
          full_name: string
          id: string
          is_verified: boolean | null
          nickname: string | null
          phone: string | null
          profile_completed: boolean | null
          reputation_score: number | null
          rut: string | null
          total_transactions: number | null
          updated_at: string | null
          verification_document_url: string | null
          verification_rejection_reason: string | null
          verification_result_email_key: string
          verification_result_email_sent_at: string | null
          verification_result_email_status: string | null
          verification_selfie_url: string | null
          verification_status: string | null
          verification_submitted_at: string | null
          welcome_email_sent: boolean
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
          dashboard_background_url?: string | null
          dashboard_color?: string | null
          dashboard_theme?: string | null
          email: string
          full_name: string
          id: string
          is_verified?: boolean | null
          nickname?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          reputation_score?: number | null
          rut?: string | null
          total_transactions?: number | null
          updated_at?: string | null
          verification_document_url?: string | null
          verification_rejection_reason?: string | null
          verification_result_email_key?: string
          verification_result_email_sent_at?: string | null
          verification_result_email_status?: string | null
          verification_selfie_url?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
          welcome_email_sent?: boolean
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
          dashboard_background_url?: string | null
          dashboard_color?: string | null
          dashboard_theme?: string | null
          email?: string
          full_name?: string
          id?: string
          is_verified?: boolean | null
          nickname?: string | null
          phone?: string | null
          profile_completed?: boolean | null
          reputation_score?: number | null
          rut?: string | null
          total_transactions?: number | null
          updated_at?: string | null
          verification_document_url?: string | null
          verification_rejection_reason?: string | null
          verification_result_email_key?: string
          verification_result_email_sent_at?: string | null
          verification_result_email_status?: string | null
          verification_selfie_url?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
          welcome_email_sent?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string | null
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh?: string | null
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
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
          admin_notes: string | null
          carrier: string | null
          created_at: string | null
          id: string
          mediated_at: string | null
          mediated_by: string | null
          reason: string
          reason_description: string | null
          received_at: string | null
          requester_id: string
          responsibility_type: string | null
          seller_response: string | null
          shipped_at: string | null
          shipping_paid_by: string | null
          status: string | null
          tracking_number: string | null
          transaction_id: string
        }
        Insert: {
          admin_notes?: string | null
          carrier?: string | null
          created_at?: string | null
          id?: string
          mediated_at?: string | null
          mediated_by?: string | null
          reason: string
          reason_description?: string | null
          received_at?: string | null
          requester_id: string
          responsibility_type?: string | null
          seller_response?: string | null
          shipped_at?: string | null
          shipping_paid_by?: string | null
          status?: string | null
          tracking_number?: string | null
          transaction_id: string
        }
        Update: {
          admin_notes?: string | null
          carrier?: string | null
          created_at?: string | null
          id?: string
          mediated_at?: string | null
          mediated_by?: string | null
          reason?: string
          reason_description?: string | null
          received_at?: string | null
          requester_id?: string
          responsibility_type?: string | null
          seller_response?: string | null
          shipped_at?: string | null
          shipping_paid_by?: string | null
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
      support_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          created_at: string
          escalated_at: string | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          escalated_at?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          escalated_at?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          appeal_status: Database["public"]["Enums"]["appeal_status"] | null
          buyer_id: string | null
          cancelled_at: string | null
          carrier: string | null
          commission: number | null
          completed_at: string | null
          created_at: string | null
          deposited_at: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          email_thread_id: string | null
          id: string
          initiator_role: string | null
          invite_code: string | null
          product_description: string | null
          product_name: string
          received_at: string | null
          sale_type: string | null
          seller_id: string
          shipped_at: string | null
          state: Database["public"]["Enums"]["transaction_state"] | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          appeal_status?: Database["public"]["Enums"]["appeal_status"] | null
          buyer_id?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string | null
          deposited_at?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          email_thread_id?: string | null
          id?: string
          initiator_role?: string | null
          invite_code?: string | null
          product_description?: string | null
          product_name: string
          received_at?: string | null
          sale_type?: string | null
          seller_id: string
          shipped_at?: string | null
          state?: Database["public"]["Enums"]["transaction_state"] | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appeal_status?: Database["public"]["Enums"]["appeal_status"] | null
          buyer_id?: string | null
          cancelled_at?: string | null
          carrier?: string | null
          commission?: number | null
          completed_at?: string | null
          created_at?: string | null
          deposited_at?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          email_thread_id?: string | null
          id?: string
          initiator_role?: string | null
          invite_code?: string | null
          product_description?: string | null
          product_name?: string
          received_at?: string | null
          sale_type?: string | null
          seller_id?: string
          shipped_at?: string | null
          state?: Database["public"]["Enums"]["transaction_state"] | null
          tracking_number?: string | null
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
          external_fee: number
          external_session_id: string | null
          id: string
          refunded_at: string | null
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
          external_fee?: number
          external_session_id?: string | null
          id?: string
          refunded_at?: string | null
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
          external_fee?: number
          external_session_id?: string | null
          id?: string
          refunded_at?: string | null
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
          blocked_balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          blocked_balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          blocked_balance?: number | null
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
      wallet_movements_safe: {
        Row: {
          amount: number | null
          balance_after: number | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_holder_name: string | null
          bank_holder_rut: string | null
          bank_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          transaction_id: string | null
          type: string | null
          wallet_id: string | null
        }
        Insert: {
          amount?: number | null
          balance_after?: number | null
          bank_account_number?: never
          bank_account_type?: string | null
          bank_holder_name?: string | null
          bank_holder_rut?: never
          bank_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          transaction_id?: string | null
          type?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number | null
          balance_after?: number | null
          bank_account_number?: never
          bank_account_type?: string | null
          bank_holder_name?: string | null
          bank_holder_rut?: never
          bank_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          transaction_id?: string | null
          type?: string | null
          wallet_id?: string | null
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
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_transaction_by_invite_code: {
        Args: { _invite_code: string }
        Returns: {
          buyer_id: string
          id: string
          sale_type: string
          seller_id: string
          state: string
        }[]
      }
      generate_invite_code: { Args: never; Returns: string }
      get_own_bank_details: {
        Args: { _user_id: string }
        Returns: {
          bank_account_number: string
          bank_account_type: string
          bank_holder_name: string
          bank_holder_rut: string
          bank_name: string
        }[]
      }
      get_safe_profile: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          is_verified: boolean
          nickname: string
          reputation_score: number
          total_transactions: number
        }[]
      }
      get_transaction_preview: {
        Args: { transaction_id: string }
        Returns: {
          amount: number
          id: string
          product_description: string
          product_name: string
          sale_type: string
          seller_name: string
          state: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_service: { Args: never; Returns: boolean }
      mask_bank_account: { Args: { account_number: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
