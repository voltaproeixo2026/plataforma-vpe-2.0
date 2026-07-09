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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          created_at: string
          date: string | null
          id: string
          name: string
          next_opportunities: string | null
          people_closed: number | null
          people_reached: number | null
          revenue: number | null
          type: string
          user_id: string
          what_to_improve: string | null
          what_worked: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          name: string
          next_opportunities?: string | null
          people_closed?: number | null
          people_reached?: number | null
          revenue?: number | null
          type?: string
          user_id: string
          what_to_improve?: string | null
          what_worked?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          name?: string
          next_opportunities?: string | null
          people_closed?: number | null
          people_reached?: number | null
          revenue?: number | null
          type?: string
          user_id?: string
          what_to_improve?: string | null
          what_worked?: string | null
        }
        Relationships: []
      }
      arsenal_entries: {
        Row: {
          category: string
          created_at: string
          id: string
          raw_content: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          raw_content?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          raw_content?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      autenticidade_maps: {
        Row: {
          created_at: string
          current_phase: number
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_phase?: number
          data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_phase?: number
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          acionado_em: string | null
          call_date: string | null
          call_time: string | null
          comum: string[] | null
          created_at: string
          email: string | null
          follow_up_date: string | null
          follow_up_objective: string | null
          id: string
          instagram: string | null
          name: string
          next_action: string | null
          notes: string | null
          origem: string | null
          prospeccao: string | null
          status: string
          temperatura: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          acionado_em?: string | null
          call_date?: string | null
          call_time?: string | null
          comum?: string[] | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          follow_up_objective?: string | null
          id?: string
          instagram?: string | null
          name: string
          next_action?: string | null
          notes?: string | null
          origem?: string | null
          prospeccao?: string | null
          status?: string
          temperatura?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          acionado_em?: string | null
          call_date?: string | null
          call_time?: string | null
          comum?: string[] | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          follow_up_objective?: string | null
          id?: string
          instagram?: string | null
          name?: string
          next_action?: string | null
          notes?: string | null
          origem?: string | null
          prospeccao?: string | null
          status?: string
          temperatura?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      content_cards: {
        Row: {
          created_at: string
          desenvolvimento: string | null
          etapa: string | null
          format: string
          funil: string | null
          id: string
          notes: string | null
          publish_date: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desenvolvimento?: string | null
          etapa?: string | null
          format?: string
          funil?: string | null
          id?: string
          notes?: string | null
          publish_date?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          desenvolvimento?: string | null
          etapa?: string | null
          format?: string
          funil?: string | null
          id?: string
          notes?: string | null
          publish_date?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_entries: {
        Row: {
          created_at: string
          creativity: number | null
          cycle_day: number | null
          cycle_length: number | null
          date: string
          emotion_scale: number | null
          id: string
          keyword: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          creativity?: number | null
          cycle_day?: number | null
          cycle_length?: number | null
          date: string
          emotion_scale?: number | null
          id?: string
          keyword?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          creativity?: number | null
          cycle_day?: number | null
          cycle_length?: number | null
          date?: string
          emotion_scale?: number | null
          id?: string
          keyword?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fat_entries: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          category?: string
          created_at?: string
          date: string
          description: string
          id?: string
          user_id: string
          value: number
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      fat_meta: {
        Row: {
          id: string
          month_ref: string
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          month_ref: string
          user_id: string
          value?: number
        }
        Update: {
          id?: string
          month_ref?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      funnels: {
        Row: {
          converted: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          steps: Json
          tested: boolean | null
          user_id: string
        }
        Insert: {
          converted?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          steps?: Json
          tested?: boolean | null
          user_id: string
        }
        Update: {
          converted?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          steps?: Json
          tested?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      intentions: {
        Row: {
          created_at: string
          id: string
          month_ref: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_ref: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_ref?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      objectives: {
        Row: {
          category: string
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          month_ref: string
          text: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          month_ref: string
          text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          month_ref?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          cycle_length: number | null
          display_name: string | null
          id: string
          last_cycle_start: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_length?: number | null
          display_name?: string | null
          id: string
          last_cycle_start?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_length?: number | null
          display_name?: string | null
          id?: string
          last_cycle_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sheets_config: {
        Row: {
          embed_url: string
          height: number
          id: string
          name: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          embed_url: string
          height?: number
          id?: string
          name?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          embed_url?: string
          height?: number
          id?: string
          name?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      ss_config: {
        Row: {
          id: string
          meta_day: number
          meta_week_reun: number
          taxa: number
          ticket: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          meta_day?: number
          meta_week_reun?: number
          taxa?: number
          ticket?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          meta_day?: number
          meta_week_reun?: number
          taxa?: number
          ticket?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ss_counts: {
        Row: {
          abordagem: number
          date: string
          id: string
          resposta: number
          reuniao: number
          user_id: string
        }
        Insert: {
          abordagem?: number
          date: string
          id?: string
          resposta?: number
          reuniao?: number
          user_id: string
        }
        Update: {
          abordagem?: number
          date?: string
          id?: string
          resposta?: number
          reuniao?: number
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          created_at: string
          description: string
          id: string
          story_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          story_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          story_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          created_at: string
          date: string
          done: boolean
          execution_status: string | null
          id: string
          notes: string | null
          priority: string
          text: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          date: string
          done?: boolean
          execution_status?: string | null
          id?: string
          notes?: string | null
          priority?: string
          text: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          done?: boolean
          execution_status?: string | null
          id?: string
          notes?: string | null
          priority?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      time_logs: {
        Row: {
          activity: string
          category: string
          created_at: string
          date: string
          id: string
          minutes: number
          notes: string | null
          user_id: string
        }
        Insert: {
          activity: string
          category?: string
          created_at?: string
          date: string
          id?: string
          minutes: number
          notes?: string | null
          user_id: string
        }
        Update: {
          activity?: string
          category?: string
          created_at?: string
          date?: string
          id?: string
          minutes?: number
          notes?: string | null
          user_id?: string
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
