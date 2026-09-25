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
      cycle_slots: {
        Row: {
          created_at: string
          done_hours: number
          hours_per_cycle: number
          id: string
          ord: number
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_hours?: number
          hours_per_cycle?: number
          id?: string
          ord?: number
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          done_hours?: number
          hours_per_cycle?: number
          id?: string
          ord?: number
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      errors: {
        Row: {
          banca: string | null
          correct_answer: string | null
          created_at: string
          id: string
          my_answer: string | null
          question: string
          reason: string | null
          resolved: boolean
          subject_id: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          banca?: string | null
          correct_answer?: string | null
          created_at?: string
          id?: string
          my_answer?: string | null
          question: string
          reason?: string | null
          resolved?: boolean
          subject_id?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          banca?: string | null
          correct_answer?: string | null
          created_at?: string
          id?: string
          my_answer?: string | null
          question?: string
          reason?: string | null
          resolved?: boolean
          subject_id?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "errors_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          box: number
          created_at: string
          error_id: string | null
          front: string
          id: string
          last_reviewed_at: string | null
          next_review_date: string
          subject_id: string | null
          times_correct: number
          times_reviewed: number
          user_id: string
        }
        Insert: {
          back: string
          box?: number
          created_at?: string
          error_id?: string | null
          front: string
          id?: string
          last_reviewed_at?: string | null
          next_review_date?: string
          subject_id?: string | null
          times_correct?: number
          times_reviewed?: number
          user_id: string
        }
        Update: {
          back?: string
          box?: number
          created_at?: string
          error_id?: string | null
          front?: string
          id?: string
          last_reviewed_at?: string | null
          next_review_date?: string
          subject_id?: string | null
          times_correct?: number
          times_reviewed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_error_id_fkey"
            columns: ["error_id"]
            isOneToOne: false
            referencedRelation: "errors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          exam_date: string | null
          exam_name: string | null
          id: string
          last_study_date: string | null
          minutes_per_question: number | null
          pages_per_hour: number | null
          review_intervals: number[]
          streak_days: number
          updated_at: string
          weekly_goal_hours: number
          weekly_goal_questions: number
          xp: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          exam_date?: string | null
          exam_name?: string | null
          id: string
          last_study_date?: string | null
          minutes_per_question?: number | null
          pages_per_hour?: number | null
          review_intervals?: number[]
          streak_days?: number
          updated_at?: string
          weekly_goal_hours?: number
          weekly_goal_questions?: number
          xp?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          exam_date?: string | null
          exam_name?: string | null
          id?: string
          last_study_date?: string | null
          minutes_per_question?: number | null
          pages_per_hour?: number | null
          review_intervals?: number[]
          streak_days?: number
          updated_at?: string
          weekly_goal_hours?: number
          weekly_goal_questions?: number
          xp?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          done: boolean
          ease: number
          id: string
          last_reviewed_at: string | null
          layer: number
          next_review_date: string
          subject_id: string
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          ease?: number
          id?: string
          last_reviewed_at?: string | null
          layer?: number
          next_review_date?: string
          subject_id: string
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          ease?: number
          id?: string
          last_reviewed_at?: string | null
          layer?: number
          next_review_date?: string
          subject_id?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["session_kind"]
          lesson: string | null
          minutes: number
          notes: string | null
          page_end: number | null
          page_start: number | null
          pages_read: number
          questions_correct: number
          questions_done: number
          session_date: string
          subject_id: string | null
          task: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["session_kind"]
          lesson?: string | null
          minutes?: number
          notes?: string | null
          page_end?: number | null
          page_start?: number | null
          pages_read?: number
          questions_correct?: number
          questions_done?: number
          session_date?: string
          subject_id?: string | null
          task?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["session_kind"]
          lesson?: string | null
          minutes?: number
          notes?: string | null
          page_end?: number | null
          page_start?: number | null
          pages_read?: number
          questions_correct?: number
          questions_done?: number
          session_date?: string
          subject_id?: string | null
          task?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          exam_questions: number
          id: string
          maintenance_questions_this_week: number
          maintenance_weekly_questions_goal: number
          min_questions: number
          name: string
          ord: number
          pages: number
          pages_read: number
          planned_hours_per_week: number
          study_status: string
          total_questions: number
          user_id: string
          weight: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          exam_questions?: number
          id?: string
          maintenance_questions_this_week?: number
          maintenance_weekly_questions_goal?: number
          min_questions?: number
          name: string
          ord?: number
          pages?: number
          pages_read?: number
          planned_hours_per_week?: number
          study_status?: string
          total_questions?: number
          user_id: string
          weight?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          exam_questions?: number
          id?: string
          maintenance_questions_this_week?: number
          maintenance_weekly_questions_goal?: number
          min_questions?: number
          name?: string
          ord?: number
          pages?: number
          pages_read?: number
          planned_hours_per_week?: number
          study_status?: string
          total_questions?: number
          user_id?: string
          weight?: number
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
      session_kind:
        | "leitura"
        | "questoes"
        | "revisao"
        | "redacao"
        | "flashcards"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      session_kind: ["leitura", "questoes", "revisao", "redacao", "flashcards"],
    },
  },
} as const
