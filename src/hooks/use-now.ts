"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

let nowMs = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(() => {
      nowMs = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearInterval(timer);
  };
}

const getSnapshot = () => (nowMs ||= Date.now());
const getServerSnapshot = () => null;

/**
 * Current time in ms, updated every 30 s. Null during server rendering and hydration,
 * so relative times ("hace 5 min") only render in the browser.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
