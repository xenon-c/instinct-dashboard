import { addDays } from "./calendar";
import type { Snapshot, Task } from "./types";

export function sampleSnapshot(today: string): Snapshot {
  const owner_id = "sample";
  const series_id = "weekly-planning";
  const nextWeek = addDays(today, 7);
  const startOfDay = new Date(`${today}T00:00:00`).getTime();
  const taskDefaults = {
    owner_id,
    status: "open",
    notes: "",
    due_time: null,
    series_id: null,
    recurrence_date: null,
  } satisfies Partial<Task>;

  return {
    tasks: [
      {
        ...taskDefaults,
        id: "outline",
        title: "Send the project outline",
        category: "Study",
        due_date: addDays(today, -1),
      },
      {
        ...taskDefaults,
        id: "library-hold",
        title: "Reserve a study room",
        category: "Study",
        due_date: today,
        status: "completed",
      },
      {
        ...taskDefaults,
        id: "reading",
        title: "Read chapter 3",
        category: "Study",
        due_date: addDays(today, 1),
        due_time: "17:00",
      },
      {
        ...taskDefaults,
        id: "groceries",
        title: "Make a grocery list",
        category: "Personal",
        due_date: null,
      },
      ...[today, nextWeek].map((date) => ({
        ...taskDefaults,
        id: `planning-${date}`,
        title: "Plan the week",
        category: "Personal",
        due_date: date,
        series_id,
        recurrence_date: date,
      })),
    ],
    commitments: [
      {
        id: "study-group",
        owner_id,
        title: "Study group",
        notes: "Bring your notes for chapter 3.",
        starts_on: addDays(today, 2),
        ends_on: null,
        start_time: "10:00",
        end_time: "11:00",
        repeats_weekly: true,
      },
      {
        id: "library-meeting",
        owner_id,
        title: "Meet at the library",
        notes: "",
        starts_on: addDays(today, 4),
        ends_on: null,
        start_time: "14:00",
        end_time: "14:30",
        repeats_weekly: false,
      },
    ],
    series: [
      {
        id: series_id,
        owner_id,
        title: "Plan the week",
        notes: "",
        category: "Personal",
        starts_on: today,
        ends_on: null,
        due_time: null,
        frequency: "weekly",
        repeat_every: 1,
        active: true,
        generated_through: nextWeek,
      },
    ],
    history: [
      {
        id: 3,
        owner_id,
        record_id: "library-hold",
        kind: "task",
        action: "completed",
        title: "Reserve a study room",
        changed_at: new Date(startOfDay - 3_600_000).toISOString(),
      },
      {
        id: 2,
        owner_id,
        record_id: "study-group",
        kind: "commitment",
        action: "edited",
        title: "Study group",
        changed_at: new Date(startOfDay - 7_200_000).toISOString(),
      },
      {
        id: 1,
        owner_id,
        record_id: series_id,
        kind: "series",
        action: "added",
        title: "Plan the week",
        changed_at: new Date(startOfDay - 86_400_000).toISOString(),
      },
    ],
  };
}
