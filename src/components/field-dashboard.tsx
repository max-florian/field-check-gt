"use client";

import { useCallback, useEffect, useState } from "react";
import { useNow } from "@/hooks/use-now";
import { formatTime } from "@/lib/format";
import type { StatusResponse } from "@/lib/weather/status";
import { FieldCard } from "./field-card";

const REFRESH_MS = 5 * 60_000;

export function FieldDashboard({ initial }: { initial: StatusResponse }) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const now = useNow();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/estado", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setData(await response.json());
      setRefreshFailed(false);
    } catch {
      setRefreshFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <p aria-live="polite">
          {refreshFailed
            ? "No se pudo actualizar. Mostrando el último dato."
            : `Actualizado a las ${formatTime(data.generatedAt)}`}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="rounded-full border border-line-strong px-3 py-1.5 font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.fields.map((field) => (
          <FieldCard key={field.slug} field={field} now={now} />
        ))}
      </div>
    </div>
  );
}
