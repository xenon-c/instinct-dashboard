import type { Commitment, Task } from "./types";

export function localDate(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function dateLabel(
  date: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(undefined, {
    ...(options ?? { weekday: "short", month: "short", day: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatTime(time: string) {
  return time.slice(0, 5);
}

export function compareTasks(a: Task, b: Task) {
  return (
    (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31") ||
    (a.due_time ?? "24:00").localeCompare(b.due_time ?? "24:00") ||
    a.title.localeCompare(b.title)
  );
}

export function isOverdue(task: Task, now: Date) {
  if (task.status !== "open" || !task.due_date) return false;
  if (!task.due_time) return task.due_date < localDate(now);
  return new Date(`${task.due_date}T${task.due_time}`) < now;
}

export type CommitmentOccurrence = {
  commitment: Commitment;
  date: string;
};

export function upcomingCommitments(
  commitments: Commitment[],
  from: string,
  through: string,
) {
  const occurrences: CommitmentOccurrence[] = [];
  for (const commitment of commitments) {
    const { starts_on, ends_on, repeats_weekly } = commitment;
    if (starts_on > through) continue;
    if (!repeats_weekly) {
      const end = ends_on ?? starts_on;
      // A commitment ending after midnight still belongs in today's agenda.
      const overnight =
        commitment.start_time &&
        commitment.end_time &&
        commitment.end_time < commitment.start_time;
      if ((overnight ? addDays(end, 1) : end) >= from) {
        occurrences.push({ commitment, date: starts_on });
      }
      continue;
    }
    // Check yesterday too so an overnight weekly commitment remains visible.
    for (
      let date = addDays(from, -1);
      date <= through;
      date = addDays(date, 1)
    ) {
      if (date < starts_on || (ends_on && date > ends_on)) continue;
      const offset = Date.parse(date) - Date.parse(starts_on);
      const overnight =
        commitment.start_time &&
        commitment.end_time &&
        commitment.end_time < commitment.start_time;
      if (offset % (7 * 86_400_000) === 0 && (date >= from || overnight)) {
        occurrences.push({ commitment, date });
      }
    }
  }
  return occurrences.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.commitment.start_time ?? "").localeCompare(
        b.commitment.start_time ?? "",
      ) ||
      a.commitment.title.localeCompare(b.commitment.title),
  );
}
