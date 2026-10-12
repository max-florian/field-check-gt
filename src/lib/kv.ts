/**
 * Minimal client for the Upstash Redis REST API (Vercel's KV integration). Without its
 * environment variables every call is a no-op, so the app also runs without it.
 */

function connection() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function isKvConfigured() {
  return connection() !== null;
}

/** Runs one Redis command. Failures are logged and return null: KV is only a cache. */
async function command(args: (string | number)[], fetchFn: typeof fetch): Promise<unknown> {
  const kv = connection();
  if (!kv) return null;
  try {
    const response = await fetchFn(kv.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${kv.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`returned ${response.status}`);
    return ((await response.json()) as { result?: unknown }).result ?? null;
  } catch (error) {
    console.warn(`KV ${args[0]} failed: ${(error as Error).message}`);
    return null;
  }
}

export async function kvGet(key: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  const result = await command(["GET", key], fetchFn);
  return typeof result === "string" ? result : null;
}

export async function kvSet(
  key: string,
  value: string,
  { expireSeconds, fetch: fetchFn = fetch }: { expireSeconds?: number; fetch?: typeof fetch } = {},
): Promise<void> {
  await command(
    expireSeconds ? ["SET", key, value, "EX", expireSeconds] : ["SET", key, value],
    fetchFn,
  );
}
