import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  isOverdue,
  localDate,
  upcomingCommitments,
} from "../src/lib/calendar";
import type { Commitment, Task } from "../src/lib/types";

const task: Task = {
  id: "task",
  owner_id: "owner",
  title: "Draft outline",
  notes: "",
  category: "",
  status: "open",
  due_date: "2026-11-26",
  due_time: null,
  series_id: null,
  recurrence_date: null,
};

const commitment: Commitment = {
  id: "meeting",
  owner_id: "owner",
  title: "Study group",
  notes: "",
  starts_on: "2026-11-25",
  ends_on: null,
  start_time: "23:00",
  end_time: "01:00",
  repeats_weekly: true,
};

test("date-only tasks are due through the end of the local day", () => {
  const late = new Date(2026, 10, 26, 23, 30);
  assert.equal(localDate(late), "2026-11-26");
  assert.equal(isOverdue(task, late), false);
  assert.equal(isOverdue({ ...task, due_time: "23:00:00" }, late), true);
  const tomorrow = new Date(2026, 10, 27, 0, 1);
  assert.equal(isOverdue(task, tomorrow), true);
  assert.equal(isOverdue({ ...task, status: "completed" }, tomorrow), false);
});

test("weekly commitments honor date bounds and show overnight occurrences", () => {
  const from = "2026-11-26";
  const through = addDays(from, 13);
  const dates = (entry: Commitment) =>
    upcomingCommitments([entry], from, through).map(({ date }) => date);

  assert.deepEqual(dates({ ...commitment, ends_on: "2026-12-02" }), [
    "2026-11-25",
    "2026-12-02",
  ]);
  assert.deepEqual(
    dates({ ...commitment, start_time: "08:00", end_time: "09:00" }),
    ["2026-12-02", "2026-12-09"],
  );
  assert.deepEqual(dates({ ...commitment, starts_on: "2026-12-16" }), []);
});

test("a multi-day commitment remains visible until its last date", () => {
  const trip = {
    ...commitment,
    repeats_weekly: false,
    start_time: null,
    end_time: null,
    ends_on: "2026-11-27",
  };
  assert.equal(
    upcomingCommitments([trip], "2026-11-27", "2026-12-10").length,
    1,
  );
  assert.equal(
    upcomingCommitments([trip], "2026-11-28", "2026-12-11").length,
    0,
  );
});
