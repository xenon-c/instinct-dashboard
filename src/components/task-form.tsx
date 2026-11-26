"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createSeries, saveTask } from "@/lib/supabase";
import type { Task, TaskSeries } from "@/lib/types";

export type Editor = { kind: "task"; task?: Task } | { kind: "series" };

export function TaskForm({
  editor,
  today,
  onClose,
  onSaved,
}: {
  editor: Editor;
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const recurring = editor.kind === "series";
  const task = editor.kind === "task" ? editor.task : undefined;
  const [date, setDate] = useState(recurring ? today : (task?.due_date ?? ""));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = recurring
    ? "New recurring task"
    : task
      ? "Edit task"
      : "New task";

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    if (!value("title")) {
      setError("Enter a task title.");
      return;
    }
    const fields = {
      title: value("title"),
      notes: value("notes"),
      category: value("category"),
      due_time: date ? value("time") || null : null,
    };
    setBusy(true);
    setError("");
    try {
      if (recurring) {
        await createSeries({
          ...fields,
          starts_on: date,
          ends_on: value("ends_on") || null,
          frequency: value("frequency") as TaskSeries["frequency"],
          repeat_every: Number(value("repeat_every")),
        });
      } else {
        await saveTask(
          {
            ...fields,
            due_date: date || null,
            status: task ? (value("status") as Task["status"]) : "open",
          },
          task?.id,
        );
      }
      onSaved();
      dialog.current?.close();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your task.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="panel editor"
      aria-labelledby="editor-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="panel-heading">
        <h2 id="editor-title">{heading}</h2>
        <button
          className="icon-button"
          aria-label="Close editor"
          disabled={busy}
          onClick={() => dialog.current?.close()}
        >
          <X size={18} />
        </button>
      </div>
      <form className="form" onSubmit={submit}>
        <label>
          Title
          <input
            name="title"
            required
            maxLength={2000}
            defaultValue={task?.title}
            autoFocus
          />
        </label>
        <div className="form-pair">
          <label>
            {recurring ? "Starts on" : "Due date"}
            <input
              type="date"
              required={recurring}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            Due time
            <input
              name="time"
              type="time"
              disabled={!date}
              defaultValue={task?.due_time?.slice(0, 5)}
            />
          </label>
        </div>
        {recurring && (
          <>
            <div className="form-pair">
              <label>
                Frequency
                <select name="frequency" defaultValue="weekly">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
              <label>
                Repeat every
                <input
                  name="repeat_every"
                  type="number"
                  min={1}
                  max={366}
                  defaultValue={1}
                  required
                />
              </label>
            </div>
            <label>
              Ends on (optional)
              <input name="ends_on" type="date" min={date || undefined} />
            </label>
          </>
        )}
        <label>
          Category
          <input name="category" defaultValue={task?.category} />
        </label>
        <label>
          Notes
          <textarea name="notes" rows={3} defaultValue={task?.notes} />
        </label>
        {task && (
          <label>
            Status
            <select name="status" defaultValue={task.status}>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button className="button primary-button" disabled={busy}>
            {busy ? "Saving…" : "Save task"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
