export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      official_regions: {
        Row: {
          created_at: string | null
          display_order: number
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: number
          name?: string
        }
        Relationships: []
      }
      official_relics: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: number
          name: string
          tier: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: number
          name: string
          tier: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: number
          name?: string
          tier?: number
        }
        Relationships: []
      }
      official_tasks: {
        Row: {
          category: string | null
          completion_percent: number | null
          created_at: string | null
          description: string | null
          id: number
          name: string
          points: number
          region: string
          skill: string | null
          tier: string
        }
        Insert: {
          category?: string | null
          completion_percent?: number | null
          created_at?: string | null
          description?: string | null
          id: number
          name: string
          points: number
          region: string
          skill?: string | null
          tier: string
        }
        Update: {
          category?: string | null
          completion_percent?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          points?: number
          region?: string
          skill?: string | null
          tier?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          admin_key: string
          created_at: string | null
          id: string
          milestone_player_state: Json | null
          milestone_selections: Json
          name: string
          player_names: Json
          updated_at: string | null
        }
        Insert: {
          admin_key: string
          created_at?: string | null
          id?: string
          milestone_player_state?: Json | null
          milestone_selections?: Json
          name?: string
          player_names?: Json
          updated_at?: string | null
        }
        Update: {
          admin_key?: string
          created_at?: string | null
          id?: string
          milestone_player_state?: Json | null
          milestone_selections?: Json
          name?: string
          player_names?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      route_steps: {
        Row: {
          created_at: string | null
          custom_text: string | null
          id: string
          player_state: Json
          room_id: string
          step_order: number
          step_type: string
          task_description: string | null
          task_id: number | null
          task_name: string | null
          task_points: number | null
          task_region: string | null
          task_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_text?: string | null
          id?: string
          player_state?: Json
          room_id: string
          step_order: number
          step_type: string
          task_description?: string | null
          task_id?: number | null
          task_name?: string | null
          task_points?: number | null
          task_region?: string | null
          task_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_text?: string | null
          id?: string
          player_state?: Json
          room_id?: string
          step_order?: number
          step_type?: string
          task_description?: string | null
          task_id?: number | null
          task_name?: string | null
          task_points?: number | null
          task_region?: string | null
          task_tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_steps_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      test_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reorder_route_steps:
        | {
            Args: { p_room_id: string; step_updates: Json[] }
            Returns: undefined
          }
        | { Args: { step_updates: Json[] }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

