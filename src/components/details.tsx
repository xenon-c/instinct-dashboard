"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { dateLabel, formatTime } from "@/lib/calendar";
import type { ChangeHistory, Commitment, Task } from "@/lib/types";
import { Dot } from "./ui";

export type Selection =
  | { kind: "task"; task: Task }
  | { kind: "commitment"; commitment: Commitment; date: string }
  | { kind: "update"; update: ChangeHistory };

export function Details({
  selection,
  onClose,
}: {
  selection: Selection;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  let title: string;
  let label: string;
  let category: string | undefined;
  let notes: string | undefined;
  let date: string;
  if (selection.kind === "task") {
    const { task } = selection;
    title = task.title;
    label = task.series_id ? "Recurring task" : "Task";
    category = task.category;
    notes = task.notes;
    date = task.due_date
      ? dateLabel(task.due_date) +
        (task.due_time ? ` · ${formatTime(task.due_time)}` : "")
      : "No due date";
  } else if (selection.kind === "commitment") {
    const { commitment } = selection;
    title = commitment.title;
    label = commitment.repeats_weekly
      ? "Weekly commitment"
      : "Fixed commitment";
    category = "Commitments";
    notes = commitment.notes;
    const start = commitment.start_time
      ? formatTime(commitment.start_time)
      : "All day";
    const end = commitment.end_time
      ? `–${formatTime(commitment.end_time)}`
      : "";
    const lastDay =
      !commitment.repeats_weekly &&
      commitment.ends_on &&
      commitment.ends_on !== selection.date
        ? ` – ${dateLabel(commitment.ends_on)}`
        : "";
    date = `${dateLabel(selection.date)}${lastDay} · ${start}${end}`;
  } else {
    const { update } = selection;
    title = update.title;
    label = update.action[0].toUpperCase() + update.action.slice(1);
    date = new Date(update.changed_at).toLocaleString();
  }

  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      aria-labelledby="detail-title"
      onClose={onClose}
    >
      <div className="dialog-inner">
        <button
          className="icon-button dialog-close"
          aria-label="Close details"
          onClick={() => dialog.current?.close()}
        >
          <X size={18} />
        </button>
        <div className="detail-eyebrow">
          <Dot category={category} />
          {label}
          {category && ` · ${category}`}
        </div>
        <h2 id="detail-title">{title}</h2>
        <p className="detail-date">{date}</p>
        {notes && <p className="detail-description">{notes}</p>}
      </div>
    </dialog>
  );
}
