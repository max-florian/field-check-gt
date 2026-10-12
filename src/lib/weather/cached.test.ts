import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeKv } from "@/test/fake-kv";
import { MAX_AGE_MS, getAllFieldStatuses, resetStatusCache } from "./cached";
import { resetApiKeyCache } from "./wunderground";

const NOW = new Date("2026-10-12T10:00:00-06:00");
const later = (ms: number) => new Date(NOW.getTime() + ms);

/** Weather sources that always fail fast, counting how often they are asked. */
function setup() {
  const kv = fakeKv();
  let weatherRequests = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    if (kv.handles(input)) return kv.respond(init);
    weatherRequests++;
    return new Response("down", { status: 503 });
  });
  return { kv, fetch, weatherRequests: () => weatherRequests };
}

beforeEach(() => {
  resetStatusCache();
  resetApiKeyCache();
});
afterEach(() => vi.unstubAllEnvs());

describe("getAllFieldStatuses", () => {
  it("fetches and stores fresh data when nothing is cached", async () => {
    const { kv, fetch, weatherRequests } = setup();
    const status = await getAllFieldStatuses({ now: NOW, fetch });

    expect(status.generatedAt).toBe(NOW.toISOString());
    expect(status.fields.map((f) => f.slug)).toEqual(["campo-marte", "las-charcas"]);
    expect(weatherRequests()).toBeGreaterThan(0);
    expect(kv.commands).toContain("SET");
  });

  it("reuses data younger than the max age without asking the sources", async () => {
    const { fetch, weatherRequests } = setup();
    await getAllFieldStatuses({ now: NOW, fetch });
    const before = weatherRequests();

    const status = await getAllFieldStatuses({ now: later(MAX_AGE_MS - 1000), fetch });
    expect(status.generatedAt).toBe(NOW.toISOString());
    expect(weatherRequests()).toBe(before);
  });

  it("shares data between instances through KV", async () => {
    const { kv, fetch, weatherRequests } = setup();
    await getAllFieldStatuses({ now: NOW, fetch });
    const before = weatherRequests();

    resetStatusCache(); // a different serverless instance
    const status = await getAllFieldStatuses({ now: later(60_000), fetch });
    expect(status.generatedAt).toBe(NOW.toISOString());
    expect(weatherRequests()).toBe(before);
    expect(kv.commands.at(-1)).toBe("GET");
  });

  it("refreshes before responding once the data is too old, even after days", async () => {
    const { fetch } = setup();
    await getAllFieldStatuses({ now: NOW, fetch });

    const threeDaysLater = later(3 * 24 * 60 * 60 * 1000);
    const status = await getAllFieldStatuses({ now: threeDaysLater, fetch });
    expect(status.generatedAt).toBe(threeDaysLater.toISOString());
  });
});
