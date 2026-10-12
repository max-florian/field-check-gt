import { LOCATIONS } from "@/config/locations";
import { kvGet, kvSet } from "@/lib/kv";
import { type FieldStatus, type StatusResponse, getFieldStatus } from "./status";
import type { ProviderOptions } from "./types";

/** Data younger than this is served as is; older data is refreshed before responding. */
export const MAX_AGE_MS = 4 * 60 * 1000;

// Per deployment, so a new version never reads data shaped by an older one.
const CACHE_KEY = `field-status:${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}`;
const CACHE_TTL_SECONDS = 60 * 60;

/** Copy for this instance, to skip the KV round trip while it is still fresh. */
let memory: StatusResponse | null = null;

export function resetStatusCache() {
  memory = null;
}

const isFresh = (status: StatusResponse | null, now: Date): status is StatusResponse =>
  status !== null && now.getTime() - new Date(status.generatedAt).getTime() < MAX_AGE_MS;

async function loadFromKv(fetchFn: typeof fetch): Promise<StatusResponse | null> {
  const json = await kvGet(CACHE_KEY, fetchFn);
  if (!json) return null;
  try {
    return JSON.parse(json) as StatusResponse;
  } catch {
    return null;
  }
}

/**
 * Status of every field, shared by all visitors through KV. Never older than
 * MAX_AGE_MS: stale data is refreshed while the request waits, not in the background,
 * so the first visit after a quiet period still gets current data.
 */
export async function getAllFieldStatuses(options: ProviderOptions = {}): Promise<StatusResponse> {
  const now = options.now ?? new Date();
  const fetchFn = options.fetch ?? fetch;

  if (isFresh(memory, now)) return memory;
  const stored = await loadFromKv(fetchFn);
  if (isFresh(stored, now)) return (memory = stored);

  // One field at a time, so later fields reuse the Wunderground key the first one found
  // instead of all scraping dashboard pages at once.
  const fields: FieldStatus[] = [];
  for (const location of LOCATIONS) fields.push(await getFieldStatus(location, options));

  memory = { generatedAt: now.toISOString(), fields };
  await kvSet(CACHE_KEY, JSON.stringify(memory), {
    expireSeconds: CACHE_TTL_SECONDS,
    fetch: fetchFn,
  });
  return memory;
}
