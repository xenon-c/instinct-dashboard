"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Layers3,
  LogOut,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { dateLabel, isOverdue, localDate } from "@/lib/calendar";
import { sampleSnapshot } from "@/lib/sample";
import { getSupabase, isConfigured, setSeriesActive } from "@/lib/supabase";
import type { ChangeHistory, Task, TaskSeries } from "@/lib/types";
import { Agenda } from "./agenda";
import { Details, type Selection } from "./details";
import { Login } from "./login";
import { DeadlinePanel, RecentUpdates } from "./panels";
import { TaskForm, type Editor } from "./task-form";
import { Brand } from "./ui";
import { useDashboard } from "./use-dashboard";

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export default function Dashboard() {
  const [showLogin, setShowLogin] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(
    isConfigured ? undefined : null,
  );

  useEffect(() => {
    if (!isConfigured) return;
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      if (session) setShowLogin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (userId === undefined)
    return (
      <main className="app-loading" aria-busy="true">
        Opening your dashboard…
      </main>
    );
  if (userId) return <Workspace key={userId} />;
  if (showLogin) return <Login onBack={() => setShowLogin(false)} />;
  return (
    <Workspace
      key="sample"
      demo
      onSignIn={isConfigured ? () => setShowLogin(true) : undefined}
    />
  );
}

function Workspace({
  demo = false,
  onSignIn,
}: {
  demo?: boolean;
  onSignIn?: () => void;
}) {
  const { data, error, refreshing, refresh } = useDashboard(!demo);
  const [now, setNow] = useState<Date | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [target, setTarget] = useState<{ date: string } | null>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    function shortcut(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        search.current
      ) {
        event.preventDefault();
        search.current.focus();
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("keydown", shortcut);
    };
  }, []);

  const today = now ? localDate(now) : "";
  const clock = now ? clockFormat.format(now) : "";
  const sample = demo || Boolean(error && !data);
  const snapshot = sample && today ? sampleSnapshot(today) : data;
  const categories = [
    ...new Set(
      snapshot &&
        [...snapshot.tasks, ...snapshot.series]
          .map((item) => item.category)
          .filter(Boolean),
    ),
  ].sort();
  const activeCategory = categories.includes(category) ? category : "";
  const needle = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(needle);
  const filtered = snapshot && {
    ...snapshot,
    tasks: snapshot.tasks.filter(
      (task) =>
        (!activeCategory || task.category === activeCategory) &&
        matches(`${task.title} ${task.notes} ${task.category}`),
    ),
    commitments: activeCategory
      ? []
      : snapshot.commitments.filter((item) =>
          matches(`${item.title} ${item.notes}`),
        ),
    series: snapshot.series.filter(
      (series) =>
        (!activeCategory || series.category === activeCategory) &&
        matches(`${series.title} ${series.notes} ${series.category}`),
    ),
  };
  const open = snapshot?.tasks.filter((task) => task.status === "open") ?? [];
  const overdue = now ? open.filter((task) => isOverdue(task, now)).length : 0;

  async function toggleSeries(series: TaskSeries) {
    if (pending) return;
    setPending(true);
    setActionError("");
    try {
      await setSeriesActive(series.id, !series.active);
      await refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not save the change.",
      );
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setActionError("");
    try {
      const { error } = await getSupabase().auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not sign out.",
      );
    }
  }

  function openTask(task: Task) {
    if (sample) setSelection({ kind: "task", task });
    else setEditor({ kind: "task", task });
  }

  function openUpdate(update: ChangeHistory) {
    if (update.kind === "task") {
      const task = snapshot?.tasks.find((item) => item.id === update.record_id);
      if (task) return openTask(task);
    }
    if (update.kind === "commitment") {
      const commitment = snapshot?.commitments.find(
        (item) => item.id === update.record_id,
      );
      if (commitment)
        return setSelection({
          kind: "commitment",
          commitment,
          date: commitment.starts_on,
        });
    }
    setSelection({ kind: "update", update });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-link active" aria-current="page">
            <Layers3 size={15} />
            Dashboard
          </Link>
        </nav>
        <div className="topbar-right">
          {clock && (
            <div className="topbar-clock">
              <span className="status-light" />
              {clock}
              <span>LOCAL</span>
            </div>
          )}
          {!demo && (
            <>
              <span className="topbar-divider" />
              <button
                className={`icon-button compact-refresh ${refreshing ? "is-refreshing" : ""}`}
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={16} />
              </button>
              <button
                className="icon-button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {sample && (
        <div className="demo-bar">
          <span>
            <Sparkles size={13} />
            <strong>Demo workspace</strong>
            <span className="demo-description">Sample data</span>
          </span>
          {onSignIn && (
            <button onClick={onSignIn}>
              Sign in
              <ArrowUpRight size={12} />
            </button>
          )}
        </div>
      )}

      <main className="workspace">
        <section className="page-heading">
          <div>
            <div className="eyebrow">YOUR DAILY PERSPECTIVE</div>
            <h1>
              {today
                ? dateLabel(today, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Dashboard"}
              <span className="heading-period">.</span>
            </h1>
            {snapshot && (
              <p>
                {open.length} open tasks<span className="inline-dot">·</span>
                <span className={overdue ? "text-warning" : ""}>
                  {overdue} overdue
                </span>
              </p>
            )}
          </div>
          {!demo && (
            <div className="heading-actions">
              {data && (
                <>
                  <button
                    className="button"
                    onClick={() => setEditor({ kind: "series" })}
                  >
                    <Repeat2 size={14} />
                    New recurring task
                  </button>
                  <button
                    className="button primary-button"
                    onClick={() => setEditor({ kind: "task" })}
                  >
                    <Plus size={14} />
                    New task
                  </button>
                </>
              )}
              <button
                className={`button refresh-button ${refreshing ? "is-refreshing" : ""}`}
                onClick={() => void refresh()}
                disabled={refreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          )}
        </section>
        {(error || actionError) && (
          <div className="error-banner" role="alert">
            <TriangleAlert size={17} />
            <div>
              {error && (
                <>
                  <strong>
                    {data
                      ? "Showing the last loaded data"
                      : "Couldn’t load your dashboard"}
                  </strong>
                  <span>{error}</span>
                </>
              )}
              {actionError && <span>{actionError}</span>}
            </div>
          </div>
        )}
        {snapshot && filtered && now ? (
          <>
            <div className="workspace-toolbar">
              <div className="search-box">
                <Search size={15} />
                <input
                  ref={search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a task or commitment…"
                  aria-label="Search tasks and commitments"
                />
                {query ? (
                  <button
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      search.current?.focus();
                    }}
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <kbd>⌘ K</kbd>
                )}
              </div>
              <div className="category-select">
                <SlidersHorizontal size={13} />
                <select
                  value={activeCategory}
                  onChange={(event) => setCategory(event.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} />
              </div>
            </div>
            <div className="dashboard-grid" aria-busy={refreshing}>
              <Agenda
                snapshot={filtered}
                now={now}
                today={today}
                clock={clock}
                target={target}
                filtering={Boolean(needle || activeCategory)}
                onTask={openTask}
                onCommitment={(commitment, date) =>
                  setSelection({ kind: "commitment", commitment, date })
                }
                onToggleSeries={
                  sample ? undefined : (series) => void toggleSeries(series)
                }
                pending={pending}
              />
              <div className="right-column">
                <DeadlinePanel
                  snapshot={snapshot}
                  today={today}
                  now={now}
                  onTask={openTask}
                  onDay={(date) => setTarget({ date })}
                />
                <RecentUpdates
                  snapshot={snapshot}
                  now={now}
                  sample={sample}
                  onOpen={openUpdate}
                />
              </div>
            </div>
            <footer className="workspace-footer">
              <span>
                <span
                  className={`status-light ${sample ? "muted-light" : error ? "warning-light" : ""}`}
                />
                {sample
                  ? "Sample data"
                  : error
                    ? "Connection interrupted"
                    : "Connected to your workspace"}
              </span>
              <span>Local time</span>
            </footer>
          </>
        ) : (
          <div
            className="dashboard-skeleton"
            role="status"
            aria-label="Loading dashboard"
          >
            <div />
            <div />
            <div />
          </div>
        )}
      </main>
      {editor && (
        <TaskForm
          editor={editor}
          today={today}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setActionError("");
            void refresh();
          }}
        />
      )}
      {selection && (
        <Details selection={selection} onClose={() => setSelection(null)} />
      )}
    </div>
  );
}
