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
          created_at?: string | null
          expires_at?: string | null
          id?: string
          investor_email?: string | null
          investor_name?: string
          investor_phone?: string | null
          is_active?: boolean | null
          token?: string
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
      property_status:
        | "draft"
        | "published"
        | "sold"
        | "archived"
        | "pending_review"
      property_type: "casa" | "terreno" | "apartamento" | "comercial" | "outro"
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
      property_status: [
        "draft",
        "published",
        "sold",
        "archived",
        "pending_review",
      ],
      property_type: ["casa", "terreno", "apartamento", "comercial", "outro"],
    },
  },
} as const
