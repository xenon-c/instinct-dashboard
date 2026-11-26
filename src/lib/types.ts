import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
export type Task = Tables["tasks"]["Row"];
export type Commitment = Tables["commitments"]["Row"];
export type TaskSeries = Tables["task_series"]["Row"];
export type ChangeHistory = Tables["change_history"]["Row"];

export type TaskValues = Pick<
  Task,
  "title" | "notes" | "category" | "due_date" | "due_time" | "status"
>;
export type SeriesValues = Pick<
  TaskSeries,
  | "title"
  | "notes"
  | "category"
  | "due_time"
  | "starts_on"
  | "ends_on"
  | "frequency"
  | "repeat_every"
>;

export type Snapshot = {
  tasks: Task[];
  commitments: Commitment[];
  series: TaskSeries[];
  history: ChangeHistory[];
};
