/**
 * Persists the last Wunderground API key that worked, so serverless instances and
 * new deployments can reuse it when the dashboard pages only embed rejected keys.
 * Uses the Upstash Redis REST API (Vercel's KV integration). Without its environment
 * variables it does nothing, and the key only lives in memory.
 */

const STORAGE_KEY = "wunderground:api-key";

function connection() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function isKeyStoreConfigured() {
  return connection() !== null;
}

/** Storage problems are logged and ignored: the scraped keys still work without it. */
async function command(path: string, fetchFn: typeof fetch): Promise<unknown> {
  const kv = connection();
  if (!kv) return null;
  try {
    const response = await fetchFn(`${kv.url}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${kv.token}` },
    });
    if (!response.ok) throw new Error(`returned ${response.status}`);
    return ((await response.json()) as { result?: unknown }).result ?? null;
  } catch (error) {
    console.warn(`Wunderground key store: ${(error as Error).message}`);
    return null;
  }
}

export async function loadStoredApiKey(fetchFn: typeof fetch): Promise<string | null> {
  const result = await command(`get/${encodeURIComponent(STORAGE_KEY)}`, fetchFn);
  return typeof result === "string" && /^[a-f0-9]{32}$/.test(result) ? result : null;
}

export async function storeApiKey(apiKey: string, fetchFn: typeof fetch): Promise<void> {
  await command(`set/${encodeURIComponent(STORAGE_KEY)}/${apiKey}`, fetchFn);
}
