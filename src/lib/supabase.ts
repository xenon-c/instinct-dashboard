import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { SeriesValues, Snapshot, TaskValues } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isConfigured = Boolean(url && key);

let client: SupabaseClient<Database> | undefined;
export function getSupabase() {
  if (!url || !key) throw new Error("Supabase is not configured.");
  client ??= createClient<Database>(url, key);
  return client;
}

const pageSize = 1000;
type Page<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

async function readRows<T>(load: (from: number, to: number) => Page<T>) {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await load(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Supabase returned no data.");
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

export async function loadSnapshot(): Promise<Snapshot> {
  const api = getSupabase();
  const [tasks, commitments, series, history] = await Promise.all([
    readRows((from, to) =>
      api.from("tasks").select("*").order("id").range(from, to),
    ),
    readRows((from, to) =>
      api.from("commitments").select("*").order("id").range(from, to),
    ),
    readRows((from, to) =>
      api.from("task_series").select("*").order("id").range(from, to),
    ),
    api
      .from("change_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(60),
  ]);
  if (history.error) throw new Error(history.error.message);
  return { tasks, commitments, series, history: history.data };
}

export async function saveTask(values: TaskValues, id?: string) {
  const tasks = getSupabase().from("tasks");
  const query = id ? tasks.update(values).eq("id", id) : tasks.insert(values);
  const { error } = await query.select("id").single();
  if (error) throw new Error(error.message);
}

export async function createSeries(values: SeriesValues) {
  const { error } = await getSupabase().from("task_series").insert(values);
  if (error) throw new Error(error.message);
}

export async function setSeriesActive(id: string, active: boolean) {
  const { error } = await getSupabase()
    .from("task_series")
    .update({ active })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}
