"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadSnapshot } from "@/lib/supabase";
import type { Snapshot } from "@/lib/types";

export function useDashboard(enabled: boolean) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(enabled);
  const request = useRef({ generation: 0 });

  const refresh = useCallback(async () => {
    const requests = request.current;
    const id = ++requests.generation;
    setRefreshing(true);
    try {
      const snapshot = await loadSnapshot();
      if (id === requests.generation) {
        setData(snapshot);
        setError("");
      }
    } catch (cause) {
      if (id === requests.generation) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load the dashboard.",
        );
      }
    } finally {
      if (id === requests.generation) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const requests = request.current;
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      requests.generation++;
    };
  }, [enabled, refresh]);

  return { data, error, refreshing, refresh };
}
