"use client";

import { useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Check,
  Circle,
  Clock3,
} from "lucide-react";
import { updateAge } from "@/lib/activity";
import {
  addDays,
  dateLabel,
  formatTime,
  upcomingCommitments,
} from "@/lib/calendar";
import type { ChangeHistory, Snapshot, Task } from "@/lib/types";
import { Dot, Empty } from "./ui";

const units = ["DAYS", "HOURS", "MINS", "SECS"];

export function DeadlinePanel({
  snapshot,
  today,
  now,
  onTask,
  onDay,
}: {
  snapshot: Snapshot;
  today: string;
  now: Date;
  onTask: (task: Task) => void;
  onDay: (date: string) => void;
}) {
  let next: Task | undefined;
  let dueAt = Infinity;
  const dayCounts = new Map<string, number>();
  const count = (date: string) =>
    dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1);
  for (const task of snapshot.tasks) {
    if (task.status !== "open" || !task.due_date) continue;
    count(task.due_date);
    const deadline = new Date(
      `${task.due_date}T${task.due_time ?? "23:59:59.999"}`,
    ).getTime();
    if (deadline > now.getTime() && deadline < dueAt) {
      next = task;
      dueAt = deadline;
    }
  }
  const commitments = upcomingCommitments(
    snapshot.commitments,
    today,
    addDays(today, 13),
  );
  for (const { commitment, date } of commitments) {
    if (!commitment.repeats_weekly) count(date < today ? today : date);
  }
  const days = Array.from({ length: 14 }, (_, offset) => {
    const date = addDays(today, offset);
    return { date, count: dayCounts.get(date) ?? 0 };
  });
  const scale = Math.max(4, ...days.map((day) => day.count));
  const remaining = next ? Math.floor((dueAt - now.getTime()) / 1000) : 0;
  const parts = [
    Math.floor(remaining / 86400),
    Math.floor(remaining / 3600) % 24,
    Math.floor(remaining / 60) % 60,
    remaining % 60,
  ];

  return (
    <section className="panel deadline-panel" aria-label="Next deadline">
      <div className="deadline-top">
        <div className="section-kicker">
          <span>
            <Clock3 size={14} />
            THE NEXT THING
          </span>
          <span className="tiny-tag">Next deadline</span>
        </div>
        {next ? (
          <>
            <div
              className="countdown"
              role="timer"
              aria-label={`Due in ${parts[0]} days, ${parts[1]} hours and ${parts[2]} minutes`}
            >
              {parts.map((value, index) => (
                <div key={units[index]}>
                  <strong>{String(value).padStart(2, "0")}</strong>
                  <span>{units[index]}</span>
                  {index < 3 && <b aria-hidden="true">:</b>}
                </div>
              ))}
            </div>
            <button className="next-task" onClick={() => onTask(next)}>
              <Dot category={next.category} />
              <span>
                <strong>{next.title}</strong>
                <small>
                  {dateLabel(next.due_date!)}
                  <span>·</span>
                  {formatTime(next.due_time ?? "23:59")}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          </>
        ) : (
          <Empty title="Nothing counting down">No upcoming deadlines.</Empty>
        )}
      </div>
      <div className="workload">
        <div className="workload-heading">
          <h3>Ahead of you</h3>
          <span>
            Next 14 days<span className="inline-dot">·</span>
            {days.reduce((sum, day) => sum + day.count, 0)} items
          </span>
        </div>
        <div
          className="workload-chart"
          aria-label="Deadlines and one-off commitments for the next fourteen days"
        >
          {days.map(({ date, count: total }) => (
            <button
              className={`workload-day ${date === today ? "chart-today" : ""}`}
              key={date}
              onClick={() => onDay(date)}
              title={`${dateLabel(date)}: ${total} items`}
              aria-label={`Show ${dateLabel(date)} in the agenda, ${total} items`}
            >
              <span className="chart-track">
                <span
                  className="chart-bar"
                  style={{ height: `${Math.max(4, (total / scale) * 100)}%` }}
                />
                <span className="bar-count">{total}</span>
              </span>
              <span className="chart-weekday">
                {dateLabel(date, { weekday: "narrow" })}
              </span>
              <span className="chart-date">{Number(date.slice(8))}</span>
            </button>
          ))}
        </div>
        <div className="chart-note">
          <span className="chart-key" />
          Deadlines &amp; one-off commitments
        </div>
      </div>
    </section>
  );
}

const filters = [
  { id: "all", label: "All activity" },
  { id: "task", label: "Tasks" },
  { id: "commitment", label: "Schedule" },
] as const;

const kindLabel = {
  task: "Task",
  commitment: "Fixed commitment",
  series: "Recurring task",
};

export function RecentUpdates({
  snapshot,
  now,
  sample,
  onOpen,
}: {
  snapshot: Snapshot;
  now: Date;
  sample: boolean;
  onOpen: (entry: ChangeHistory) => void;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [limit, setLimit] = useState(5);
  const rows = snapshot.history.filter(
    (entry) =>
      filter === "all" ||
      entry.kind === filter ||
      (filter === "task" && entry.kind === "series"),
  );

  return (
    <section className="panel updates-panel" aria-label="Recent updates">
      <div className="panel-heading">
        <div>
          <Activity size={15} />
          <h2>Recent updates</h2>
        </div>
        <span className="updates-count">{snapshot.history.length}</span>
      </div>
      <div className="updates-filter">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            className={filter === id ? "selected" : ""}
            aria-pressed={filter === id}
            onClick={() => {
              setFilter(id);
              setLimit(5);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="updates-scroll"
        role="region"
        aria-label="Recent updates list"
        tabIndex={0}
      >
        <div className="updates-list">
          {rows.length ? (
            rows.slice(0, limit).map((entry) => {
              const completed = entry.action === "completed";
              const icon = completed ? (
                <Check size={15} />
              ) : entry.kind === "commitment" ||
                entry.action === "rescheduled" ? (
                <CalendarDays size={14} />
              ) : (
                <Circle size={12} />
              );
              return (
                <button
                  className="update-row"
                  key={entry.id}
                  onClick={() => onOpen(entry)}
                >
                  <span
                    className={`update-icon ${completed ? "update-completed" : ""}`}
                  >
                    {icon}
                  </span>
                  <span className="update-content">
                    <span className="update-verb">
                      {entry.action[0].toUpperCase() + entry.action.slice(1)}
                      <small>
                        {updateAge(Date.parse(entry.changed_at), now)}
                      </small>
                    </span>
                    <strong>{entry.title}</strong>
                    <span className="update-detail">
                      {kindLabel[entry.kind]}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <Empty title="A quiet moment">No updates to show yet.</Empty>
          )}
        </div>
        {rows.length > limit && (
          <button className="show-more" onClick={() => setLimit(limit + 10)}>
            Show more updates
            <ArrowDown size={13} />
          </button>
        )}
      </div>
      <div className="updates-footer">
        <span className={`status-light ${sample ? "muted-light" : ""}`} />
        {sample ? "Sample activity" : "Task and schedule activity"}
      </div>
    </section>
  );
}
