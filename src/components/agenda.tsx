"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Repeat2,
  TriangleAlert,
} from "lucide-react";
import {
  addDays,
  compareTasks,
  dateLabel,
  formatTime,
  isOverdue,
  upcomingCommitments,
} from "@/lib/calendar";
import type { Commitment, Snapshot, Task, TaskSeries } from "@/lib/types";
import { Dot } from "./ui";

type Entry = {
  item: Task | Commitment;
  date: string;
  time: string;
  sortTime: string;
  deadline: boolean;
  repeating: boolean;
};

export function Agenda({
  snapshot,
  now,
  today,
  clock,
  target,
  filtering,
  onTask,
  onCommitment,
  onToggleSeries,
  pending,
}: {
  snapshot: Snapshot;
  now: Date;
  today: string;
  clock: string;
  target: { date: string } | null;
  filtering: boolean;
  onTask: (task: Task) => void;
  onCommitment: (commitment: Commitment, date: string) => void;
  onToggleSeries?: (series: TaskSeries) => void;
  pending: boolean;
}) {
  const [horizon, setHorizon] = useState(14);
  const [undatedOpen, setUndatedOpen] = useState(false);
  const targetDay = useRef<HTMLElement>(null);

  useEffect(() => {
    if (target) targetDay.current?.scrollIntoView({ block: "nearest" });
  }, [target]);

  const groups = new Map<string, Entry[]>([[today, []]]);
  if (target) groups.set(target.date, []);
  const through = addDays(today, horizon - 1);
  const sorted = [...snapshot.tasks].sort(compareTasks);
  const overdue: Task[] = [];
  const undated: Task[] = [];
  const closed: Task[] = [];
  const later: Task[] = [];

  function add(date: string, entry: Entry) {
    const entries = groups.get(date) ?? [];
    entries.push(entry);
    groups.set(date, entries);
  }

  for (const task of sorted) {
    const { due_date, due_time } = task;
    if (task.status !== "open") closed.push(task);
    else if (!due_date) undated.push(task);
    else if (isOverdue(task, now)) overdue.push(task);
    else if (due_date <= through) {
      add(due_date, {
        item: task,
        date: due_date,
        time: due_time ? formatTime(due_time) : "23:59",
        sortTime: due_time ? formatTime(due_time) : "24:00",
        deadline: true,
        repeating: Boolean(task.series_id),
      });
    } else later.push(task);
  }

  for (const { commitment, date } of upcomingCommitments(
    snapshot.commitments,
    today,
    through,
  )) {
    const start = commitment.start_time
      ? formatTime(commitment.start_time)
      : "";
    const end = commitment.end_time ? formatTime(commitment.end_time) : "";
    const time = end ? `${start}–${end}` : start || "All day";
    add(date < today ? today : date, {
      item: commitment,
      date,
      time,
      sortTime: start,
      deadline: false,
      repeating: commitment.repeats_weekly,
    });
  }

  return (
    <section className="panel agenda-panel" aria-label="Agenda">
      <div className="panel-heading">
        <div>
          <CalendarDays size={15} />
          <h2>Your agenda</h2>
          <span className="soft-count">Next {horizon} days</span>
        </div>
        <span className="subtle-text">LOCAL TIME</span>
      </div>
      <div
        className="agenda-scroll"
        role="region"
        aria-label="Agenda items"
        tabIndex={0}
      >
        {overdue.length > 0 && (
          <section className="overdue-section">
            <div className="overdue-heading">
              <span>
                <TriangleAlert size={13} />
                Needs a little attention
              </span>
              <span>{overdue.length} overdue</span>
            </div>
            {overdue.map((task) => (
              <button
                className="overdue-row"
                key={task.id}
                onClick={() => onTask(task)}
              >
                <Dot category={task.category} />
                <span className="overdue-title">{task.title}</span>
                <span className="overdue-date">
                  {dateLabel(task.due_date!)}
                </span>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </section>
        )}
        <div className="agenda-days">
          {[...groups]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, list]) => {
              const isToday = date === today;
              const ordered = list.sort((a, b) =>
                a.sortTime.localeCompare(b.sortTime),
              );
              const marker = isToday
                ? ordered.findIndex((entry) => entry.sortTime >= clock)
                : -1;
              return (
                <section
                  className={`agenda-day ${isToday ? "is-today" : ""}`}
                  key={date}
                  ref={target?.date === date ? targetDay : undefined}
                >
                  <div className="day-label">
                    <span className="day-number">{Number(date.slice(8))}</span>
                    <span>
                      <strong>
                        {isToday
                          ? "TODAY"
                          : dateLabel(date, { weekday: "short" }).toUpperCase()}
                      </strong>
                      <small>{dateLabel(date, { month: "short" })}</small>
                    </span>
                  </div>
                  <div className="day-events">
                    {ordered.length === 0 && (
                      <div className="agenda-empty">
                        {filtering
                          ? "No matches for this date."
                          : "Nothing scheduled."}
                      </div>
                    )}
                    {ordered.map(
                      (
                        {
                          item,
                          date: occurrenceDate,
                          time,
                          deadline,
                          repeating,
                        },
                        index,
                      ) => (
                        <div
                          key={`${deadline ? "task" : "commitment"}:${item.id}`}
                        >
                          {index === marker && <NowMarker clock={clock} />}
                          <button
                            className="agenda-row"
                            onClick={() =>
                              "status" in item
                                ? onTask(item)
                                : onCommitment(item, occurrenceDate)
                            }
                          >
                            <span
                              className={`event-time ${deadline ? "deadline-time" : ""}`}
                            >
                              {time}
                            </span>
                            <Dot
                              category={
                                "category" in item
                                  ? item.category
                                  : "Commitments"
                              }
                            />
                            <span className="event-title">
                              {item.title}
                              {repeating && (
                                <span className="row-meta">
                                  <Repeat2 size={11} aria-label="Recurring" />
                                </span>
                              )}
                            </span>
                          </button>
                        </div>
                      ),
                    )}
                    {isToday && marker === -1 && (
                      <NowMarker clock={clock} end />
                    )}
                  </div>
                </section>
              );
            })}
        </div>
        {horizon < 400 && (
          <button
            className="show-more"
            onClick={() => setHorizon(Math.min(400, horizon + 30))}
          >
            Look a little further ahead
            <ArrowDown size={13} />
          </button>
        )}
        {later.length > 0 && (
          <details className="undated-section closed-tasks">
            <summary className="undated-toggle">
              <span>Due later</span>
              <span className="soft-count">{later.length}</span>
            </summary>
            <AgendaTasks tasks={later} onTask={onTask} />
          </details>
        )}
        {undated.length > 0 && (
          <section className="undated-section">
            <button
              className="undated-toggle"
              onClick={() => setUndatedOpen(!undatedOpen)}
              aria-expanded={undatedOpen}
            >
              <ChevronRight
                size={14}
                className={undatedOpen ? "rotated" : ""}
              />
              <span>No date, still on your mind</span>
              <span className="soft-count">{undated.length}</span>
            </button>
            {undatedOpen && <AgendaTasks tasks={undated} onTask={onTask} />}
          </section>
        )}
        {closed.length > 0 && (
          <details className="undated-section closed-tasks">
            <summary className="undated-toggle">
              <span>Completed and cancelled</span>
              <span className="soft-count">{closed.length}</span>
            </summary>
            <AgendaTasks tasks={closed} onTask={onTask} />
          </details>
        )}
        {snapshot.series.length > 0 && (
          <details className="undated-section closed-tasks">
            <summary className="undated-toggle">
              <span>Recurring tasks</span>
              <span className="soft-count">{snapshot.series.length}</span>
            </summary>
            <div className="series-list">
              {snapshot.series.map((series) => (
                <div className="series-row" key={series.id}>
                  <span>
                    {series.title}
                    <small>
                      {series.repeat_every === 1
                        ? series.frequency
                        : `Interval: ${series.repeat_every} · ${series.frequency}`}
                      {!series.active && " · Paused"}
                    </small>
                  </span>
                  {onToggleSeries && (
                    <button
                      className="button"
                      disabled={pending}
                      aria-label={`${series.active ? "Pause" : "Resume"} ${series.title}`}
                      onClick={() => onToggleSeries(series)}
                    >
                      {series.active ? "Pause" : "Resume"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function NowMarker({ clock, end }: { clock: string; end?: boolean }) {
  return (
    <div className={`now-marker ${end ? "end-marker" : ""}`}>
      <span />
      {clock}
    </div>
  );
}

function AgendaTasks({
  tasks,
  onTask,
}: {
  tasks: Task[];
  onTask: (task: Task) => void;
}) {
  return (
    <div className="undated-group">
      {tasks.map((task) => (
        <button key={task.id} onClick={() => onTask(task)}>
          <Dot category={task.category} />
          <span>{task.title}</span>
          {task.status !== "open" ? (
            <small>{task.status}</small>
          ) : (
            task.due_date && <small>{dateLabel(task.due_date)}</small>
          )}
        </button>
      ))}
    </div>
  );
}
