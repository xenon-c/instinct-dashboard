export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      change_history: {
        Row: {
          action: Database["public"]["Enums"]["history_action"];
          changed_at: string;
          id: number;
          kind: Database["public"]["Enums"]["history_kind"];
          owner_id: string;
          record_id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          action: Database["public"]["Enums"]["history_action"];
          changed_at?: string;
          id?: never;
          kind: Database["public"]["Enums"]["history_kind"];
          owner_id: string;
          record_id: string;
          title: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["history_action"];
          changed_at?: string;
          id?: never;
          kind?: Database["public"]["Enums"]["history_kind"];
          owner_id?: string;
          record_id?: string;
          title?: string;
        };
        Relationships: [];
      };
      commitments: {
        Row: {
          end_time: string | null;
          ends_on: string | null;
          id: string;
          notes: string;
          owner_id: string;
          repeats_weekly: boolean;
          start_time: string | null;
          starts_on: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          end_time?: string | null;
          ends_on?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          repeats_weekly?: boolean;
          start_time?: string | null;
          starts_on: string;
          title: string;
        };
        Update: {
          end_time?: string | null;
          ends_on?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          repeats_weekly?: boolean;
          start_time?: string | null;
          starts_on?: string;
          title?: string;
        };
        Relationships: [];
      };
      task_series: {
        Row: {
          active: boolean;
          category: string;
          due_time: string | null;
          ends_on: string | null;
          frequency: Database["public"]["Enums"]["repeat_frequency"];
          generated_through: string | null;
          id: string;
          notes: string;
          owner_id: string;
          repeat_every: number;
          starts_on: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          category?: string;
          due_time?: string | null;
          ends_on?: string | null;
          frequency: Database["public"]["Enums"]["repeat_frequency"];
          generated_through?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          repeat_every?: number;
          starts_on: string;
          title: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          due_time?: string | null;
          ends_on?: string | null;
          frequency?: Database["public"]["Enums"]["repeat_frequency"];
          generated_through?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          repeat_every?: number;
          starts_on?: string;
          title?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          category: string;
          due_date: string | null;
          due_time: string | null;
          id: string;
          notes: string;
          owner_id: string;
          recurrence_date: string | null;
          series_id: string | null;
          status: Database["public"]["Enums"]["task_status"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          recurrence_date?: string | null;
          series_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
        };
        Update: {
          category?: string;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          notes?: string;
          owner_id?: string;
          recurrence_date?: string | null;
          series_id?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_series_id_owner_id_fkey";
            columns: ["series_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "task_series";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      materialize_recurring_tasks: {
        Args: { through_date?: string };
        Returns: number;
      };
    };
    Enums: {
      history_action:
        | "added"
        | "edited"
        | "completed"
        | "cancelled"
        | "reopened"
        | "rescheduled"
        | "paused"
        | "resumed"
        | "deleted";
      history_kind: "task" | "commitment" | "series";
      repeat_frequency: "daily" | "weekly" | "monthly" | "yearly";
      task_status: "open" | "completed" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      history_action: [
        "added",
        "edited",
        "completed",
        "cancelled",
        "reopened",
        "rescheduled",
        "paused",
        "resumed",
        "deleted",
      ],
      history_kind: ["task", "commitment", "series"],
      repeat_frequency: ["daily", "weekly", "monthly", "yearly"],
      task_status: ["open", "completed", "cancelled"],
    },
  },
} as const;
