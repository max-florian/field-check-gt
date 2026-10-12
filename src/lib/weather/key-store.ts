import { kvGet, kvSet } from "@/lib/kv";

/**
 * Persists the last Wunderground API key that worked, so serverless instances and
 * new deployments can reuse it when the dashboard pages only embed rejected keys.
 */
const STORAGE_KEY = "wunderground:api-key";

export async function loadStoredApiKey(fetchFn: typeof fetch): Promise<string | null> {
  const value = await kvGet(STORAGE_KEY, fetchFn);
  return value && /^[a-f0-9]{32}$/.test(value) ? value : null;
}

export async function storeApiKey(apiKey: string, fetchFn: typeof fetch): Promise<void> {
  await kvSet(STORAGE_KEY, apiKey, { fetch: fetchFn });
}
