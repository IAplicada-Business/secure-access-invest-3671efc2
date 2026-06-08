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
      access_links: {
        Row: {
          client_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          investor_email: string | null
          investor_name: string
          investor_phone: string | null
          is_active: boolean | null
          token: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          investor_email?: string | null
          investor_name: string
          investor_phone?: string | null
          is_active?: boolean | null
          token: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          investor_email?: string | null
          investor_name?: string
          investor_phone?: string | null
          is_active?: boolean | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          category: string
          client_id: string
          file_name: string
          file_url: string
          id: string
          uploaded_at: string
        }
        Insert: {
          category?: string
          client_id: string
          file_name: string
          file_url: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          category?: string
          client_id?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          client_id: string
          created_at: string
          id: string
          interaction_date: string
          note: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          interaction_date?: string
          note: string
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          interaction_date?: string
          note?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          canal_entrada: string | null
          canal_entrada_detalhe: string | null
          cidade: string | null
          cnpj: string | null
          cpf_cnpj: string | null
          created_at: string
          crm_stage: Database["public"]["Enums"]["crm_stage_enum"]
          data_nascimento: string | null
          endereco: string | null
          crm_stage_changed_at: string | null
          drive_link: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          observacoes: string | null
          origin: string | null
          partner_id: string | null
          partner_name: string | null
          phone: string
          status: Database["public"]["Enums"]["client_status"]
          tags: string[]
          type: Database["public"]["Enums"]["client_type"]
        }
        Insert: {
          canal_entrada?: string | null
          canal_entrada_detalhe?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf_cnpj?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          created_at?: string
          crm_stage?: Database["public"]["Enums"]["crm_stage_enum"]
          crm_stage_changed_at?: string | null
          drive_link?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          observacoes?: string | null
          origin?: string | null
          partner_id?: string | null
          partner_name?: string | null
          phone: string
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[]
          type?: Database["public"]["Enums"]["client_type"]
        }
        Update: {
          canal_entrada?: string | null
          canal_entrada_detalhe?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf_cnpj?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          created_at?: string
          crm_stage?: Database["public"]["Enums"]["crm_stage_enum"]
          crm_stage_changed_at?: string | null
          drive_link?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          observacoes?: string | null
          origin?: string | null
          partner_id?: string | null
          partner_name?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["client_status"]
          tags?: string[]
          type?: Database["public"]["Enums"]["client_type"]
        }
        Relationships: [
          {
            foreignKeyName: "clients_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          client_id: string
          from_stage: Database["public"]["Enums"]["crm_stage_enum"] | null
          id: string
          to_stage: Database["public"]["Enums"]["crm_stage_enum"] | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          client_id: string
          from_stage?: Database["public"]["Enums"]["crm_stage_enum"] | null
          id?: string
          to_stage?: Database["public"]["Enums"]["crm_stage_enum"] | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          client_id?: string
          from_stage?: Database["public"]["Enums"]["crm_stage_enum"] | null
          id?: string
          to_stage?: Database["public"]["Enums"]["crm_stage_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_stage_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      user_screen_permissions: {
        Row: {
          created_at: string
          screen: string
          user_id: string
        }
        Insert: {
          created_at?: string
          screen: string
          user_id: string
        }
        Update: {
          created_at?: string
          screen?: string
          user_id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          paid_at: string | null
          partner_id: string
          rate: number
          revenue_id: string
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_id: string
          rate: number
          revenue_id: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_id?: string
          rate?: number
          revenue_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_revenue_id_fkey"
            columns: ["revenue_id"]
            isOneToOne: false
            referencedRelation: "revenues"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_recipients: {
        Row: {
          communication_id: string
          contact_id: string
          contact_name: string
          contact_phone: string
          contact_type: Database["public"]["Enums"]["communication_contact_type"]
          id: string
          sent_at: string | null
        }
        Insert: {
          communication_id: string
          contact_id: string
          contact_name: string
          contact_phone: string
          contact_type: Database["public"]["Enums"]["communication_contact_type"]
          id?: string
          sent_at?: string | null
        }
        Update: {
          communication_id?: string
          contact_id?: string
          contact_name?: string
          contact_phone?: string
          contact_type?: Database["public"]["Enums"]["communication_contact_type"]
          id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_recipients_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          audience_filter: string | null
          audience_type: Database["public"]["Enums"]["communication_audience"]
          briefing_points: string | null
          briefing_topic: string | null
          created_at: string
          final_content: string | null
          generated_content: string | null
          id: string
          status: Database["public"]["Enums"]["communication_status"]
          title: string
          tone: Database["public"]["Enums"]["communication_tone"]
          type: Database["public"]["Enums"]["communication_type"]
        }
        Insert: {
          audience_filter?: string | null
          audience_type?: Database["public"]["Enums"]["communication_audience"]
          briefing_points?: string | null
          briefing_topic?: string | null
          created_at?: string
          final_content?: string | null
          generated_content?: string | null
          id?: string
          status?: Database["public"]["Enums"]["communication_status"]
          title: string
          tone?: Database["public"]["Enums"]["communication_tone"]
          type: Database["public"]["Enums"]["communication_type"]
        }
        Update: {
          audience_filter?: string | null
          audience_type?: Database["public"]["Enums"]["communication_audience"]
          briefing_points?: string | null
          briefing_topic?: string | null
          created_at?: string
          final_content?: string | null
          generated_content?: string | null
          id?: string
          status?: Database["public"]["Enums"]["communication_status"]
          title?: string
          tone?: Database["public"]["Enums"]["communication_tone"]
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Relationships: []
      }
      cta_clicks: {
        Row: {
          access_link_id: string | null
          clicked_at: string | null
          id: string
          property_id: string | null
        }
        Insert: {
          access_link_id?: string | null
          clicked_at?: string | null
          id?: string
          property_id?: string | null
        }
        Update: {
          access_link_id?: string | null
          clicked_at?: string | null
          id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cta_clicks_access_link_id_fkey"
            columns: ["access_link_id"]
            isOneToOne: false
            referencedRelation: "access_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cta_clicks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["document_template_status"]
          type: Database["public"]["Enums"]["document_template_type"]
          variables: Json | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["document_template_status"]
          type: Database["public"]["Enums"]["document_template_type"]
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["document_template_status"]
          type?: Database["public"]["Enums"]["document_template_type"]
          variables?: Json | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string
          id: string
          is_recurring: boolean
          related_commission_id: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          related_commission_id?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          related_commission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_related_commission_id_fkey"
            columns: ["related_commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          client_id: string | null
          created_at: string
          file_url: string | null
          id: string
          process_id: string | null
          status: Database["public"]["Enums"]["generated_document_status"]
          template_id: string | null
          title: string
          type: Database["public"]["Enums"]["document_template_type"]
          variables_data: Json | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          process_id?: string | null
          status?: Database["public"]["Enums"]["generated_document_status"]
          template_id?: string | null
          title: string
          type: Database["public"]["Enums"]["document_template_type"]
          variables_data?: Json | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          process_id?: string | null
          status?: Database["public"]["Enums"]["generated_document_status"]
          template_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["document_template_type"]
          variables_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "regularization_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          access_link_id: string | null
          id: string
          property_id: string | null
          scroll_depth_percent: number | null
          time_spent_seconds: number | null
          viewed_at: string | null
        }
        Insert: {
          access_link_id?: string | null
          id?: string
          property_id?: string | null
          scroll_depth_percent?: number | null
          time_spent_seconds?: number | null
          viewed_at?: string | null
        }
        Update: {
          access_link_id?: string | null
          id?: string
          property_id?: string | null
          scroll_depth_percent?: number | null
          time_spent_seconds?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_access_link_id_fkey"
            columns: ["access_link_id"]
            isOneToOne: false
            referencedRelation: "access_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_date: string
          note: string
          partner_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_date?: string
          note: string
          partner_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_date?: string
          note?: string
          partner_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_interactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          affiliated_agency: string | null
          commission_rate: number | null
          created_at: string
          creci: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          parent_partner_id: string | null
          phone: string
          status: Database["public"]["Enums"]["partner_status"]
          type: Database["public"]["Enums"]["partner_type"]
          website: string | null
        }
        Insert: {
          affiliated_agency?: string | null
          commission_rate?: number | null
          created_at?: string
          creci?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          parent_partner_id?: string | null
          phone: string
          status?: Database["public"]["Enums"]["partner_status"]
          type?: Database["public"]["Enums"]["partner_type"]
          website?: string | null
        }
        Update: {
          affiliated_agency?: string | null
          commission_rate?: number | null
          created_at?: string
          creci?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          parent_partner_id?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["partner_status"]
          type?: Database["public"]["Enums"]["partner_type"]
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_parent_partner_id_fkey"
            columns: ["parent_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          acquisition_cost: number | null
          address: string | null
          city: string | null
          cover_image: string | null
          created_at: string | null
          description: string | null
          has_certidoes: boolean | null
          has_iptu: boolean | null
          has_matricula: boolean | null
          has_planta: boolean | null
          highlight_tag: string | null
          id: string
          images: string[] | null
          investor_notes: string | null
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          projected_value: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          regularization_cost: number | null
          regularization_time: string | null
          risk_level: string | null
          risks: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acquisition_cost?: number | null
          address?: string | null
          city?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          has_certidoes?: boolean | null
          has_iptu?: boolean | null
          has_matricula?: boolean | null
          has_planta?: boolean | null
          highlight_tag?: string | null
          id?: string
          images?: string[] | null
          investor_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          projected_value?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          regularization_cost?: number | null
          regularization_time?: string | null
          risk_level?: string | null
          risks?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acquisition_cost?: number | null
          address?: string | null
          city?: string | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          has_certidoes?: boolean | null
          has_iptu?: boolean | null
          has_matricula?: boolean | null
          has_planta?: boolean | null
          highlight_tag?: string | null
          id?: string
          images?: string[] | null
          investor_notes?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          projected_value?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          regularization_cost?: number | null
          regularization_time?: string | null
          risk_level?: string | null
          risks?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      property_submissions: {
        Row: {
          broker_company: string | null
          broker_name: string
          broker_phone: string
          created_at: string
          id: string
          irregularity_notes: string | null
          matricula_status: string
          owner_name: string | null
          partner_id: string | null
          property_id: string
          submission_link_id: string | null
        }
        Insert: {
          broker_company?: string | null
          broker_name: string
          broker_phone: string
          created_at?: string
          id?: string
          irregularity_notes?: string | null
          matricula_status?: string
          owner_name?: string | null
          partner_id?: string | null
          property_id: string
          submission_link_id?: string | null
        }
        Update: {
          broker_company?: string | null
          broker_name?: string
          broker_phone?: string
          created_at?: string
          id?: string
          irregularity_notes?: string | null
          matricula_status?: string
          owner_name?: string | null
          partner_id?: string | null
          property_id?: string
          submission_link_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_submissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_submissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_submissions_submission_link_id_fkey"
            columns: ["submission_link_id"]
            isOneToOne: false
            referencedRelation: "submission_links"
            referencedColumns: ["id"]
          },
        ]
      }
      regularization_checklist_items: {
        Row: {
          description: string
          id: string
          notes: string | null
          process_id: string
          received_at: string | null
          status: Database["public"]["Enums"]["checklist_item_status"]
        }
        Insert: {
          description: string
          id?: string
          notes?: string | null
          process_id: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["checklist_item_status"]
        }
        Update: {
          description?: string
          id?: string
          notes?: string | null
          process_id?: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["checklist_item_status"]
        }
        Relationships: [
          {
            foreignKeyName: "regularization_checklist_items_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "regularization_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      regularization_documents: {
        Row: {
          category: string
          file_name: string
          file_url: string
          id: string
          process_id: string
          uploaded_at: string
        }
        Insert: {
          category?: string
          file_name: string
          file_url: string
          id?: string
          process_id: string
          uploaded_at?: string
        }
        Update: {
          category?: string
          file_name?: string
          file_url?: string
          id?: string
          process_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regularization_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "regularization_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      regularization_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_date: string
          is_automatic: boolean
          note: string
          process_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_date?: string
          is_automatic?: boolean
          note: string
          process_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_date?: string
          is_automatic?: boolean
          note?: string
          process_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "regularization_interactions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "regularization_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      regularization_processes: {
        Row: {
          address: string | null
          client_id: string | null
          created_at: string
          estimated_completion: string | null
          estimated_value: number | null
          id: string
          notes: string | null
          property_submission_id: string | null
          property_type: string | null
          status: Database["public"]["Enums"]["regularization_status"]
          title: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          estimated_completion?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          property_submission_id?: string | null
          property_type?: string | null
          status?: Database["public"]["Enums"]["regularization_status"]
          title: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_id?: string | null
          created_at?: string
          estimated_completion?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          property_submission_id?: string | null
          property_type?: string | null
          status?: Database["public"]["Enums"]["regularization_status"]
          title?: string
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regularization_processes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regularization_processes_property_submission_id_fkey"
            columns: ["property_submission_id"]
            isOneToOne: false
            referencedRelation: "property_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regularization_processes_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "regularization_types"
            referencedColumns: ["id"]
          },
        ]
      }
      regularization_types: {
        Row: {
          checklist_template: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          checklist_template?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          checklist_template?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      revenues: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          partner_id: string | null
          received_at: string
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          received_at?: string
          service_type?: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          received_at?: string
          service_type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: [
          {
            foreignKeyName: "revenues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      submission_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          token?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      checklist_item_status: "pendente" | "recebido" | "nao_se_aplica"
      client_status: "prospect" | "active" | "completed"
      client_type: "investor" | "incorporator" | "individual"
      commission_status: "pending" | "paid"
      crm_stage_enum:
        | "contato"
        | "agendar_reuniao"
        | "envio_proposta"
        | "follow_up"
        | "fechamento"
        | "aguardando_pagamento"
        | "perdido"
      communication_audience:
        | "all_partners"
        | "partner_type"
        | "all_clients"
        | "manual"
      communication_contact_type: "partner" | "client"
      communication_status: "rascunho" | "pronta" | "enviada"
      communication_tone: "informativo" | "comercial" | "relacionamento"
      communication_type: "newsletter" | "aviso" | "oferta" | "personalizada"
      document_template_status: "ativo" | "rascunho"
      document_template_type: "proposta" | "contrato" | "relatorio"
      expense_category:
        | "salario"
        | "comissao_paga"
        | "fornecedor"
        | "escritorio"
        | "marketing"
        | "outro"
      generated_document_status:
        | "rascunho"
        | "enviado"
        | "assinado"
        | "arquivado"
      partner_status: "active" | "inactive"
      partner_type:
        | "imobiliaria"
        | "corretor_autonomo"
        | "assessor_investimento"
        | "arquiteto"
        | "engenheiro"
        | "contador"
        | "outro"
      property_status:
        | "draft"
        | "published"
        | "sold"
        | "archived"
        | "pending_review"
      property_type: "casa" | "terreno" | "apartamento" | "comercial" | "outro"
      regularization_status:
        | "nova"
        | "em_analise"
        | "proposta_enviada"
        | "em_execucao"
        | "concluida"
        | "arquivada"
      service_type:
        | "regularizacao"
        | "venda_plataforma"
        | "consultoria"
        | "outro"
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
      checklist_item_status: ["pendente", "recebido", "nao_se_aplica"],
      client_status: ["prospect", "active", "completed"],
      client_type: ["investor", "incorporator", "individual"],
      commission_status: ["pending", "paid"],
      crm_stage_enum: [
        "contato",
        "agendar_reuniao",
        "envio_proposta",
        "follow_up",
        "fechamento",
        "aguardando_pagamento",
        "perdido",
      ],
      communication_audience: [
        "all_partners",
        "partner_type",
        "all_clients",
        "manual",
      ],
      communication_contact_type: ["partner", "client"],
      communication_status: ["rascunho", "pronta", "enviada"],
      communication_tone: ["informativo", "comercial", "relacionamento"],
      communication_type: ["newsletter", "aviso", "oferta", "personalizada"],
      document_template_status: ["ativo", "rascunho"],
      document_template_type: ["proposta", "contrato", "relatorio"],
      expense_category: [
        "salario",
        "comissao_paga",
        "fornecedor",
        "escritorio",
        "marketing",
        "outro",
      ],
      generated_document_status: [
        "rascunho",
        "enviado",
        "assinado",
        "arquivado",
      ],
      partner_status: ["active", "inactive"],
      partner_type: [
        "imobiliaria",
        "corretor_autonomo",
        "assessor_investimento",
        "arquiteto",
        "engenheiro",
        "contador",
        "outro",
      ],
      property_status: [
        "draft",
        "published",
        "sold",
        "archived",
        "pending_review",
      ],
      property_type: ["casa", "terreno", "apartamento", "comercial", "outro"],
      regularization_status: [
        "nova",
        "em_analise",
        "proposta_enviada",
        "em_execucao",
        "concluida",
        "arquivada",
      ],
      service_type: [
        "regularizacao",
        "venda_plataforma",
        "consultoria",
        "outro",
      ],
    },
  },
} as const
