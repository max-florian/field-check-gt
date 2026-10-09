import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocation } from "@/config/locations";
import { getFieldWeather } from "./index";
import { resetApiKeyCache } from "./wunderground";

const KEY = "a".repeat(32);
const charcas = getLocation("las-charcas")!;
const NOW = new Date("2026-10-08T14:25:00-06:00");
const nowEpoch = NOW.getTime() / 1000;

/** Fake APIs where each station is either online, stale or missing. */
function mockFetch(stations: Record<string, "online" | "stale" | "missing">) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === "www.wunderground.com") return new Response(`apiKey=${KEY}`);
    if (url.hostname === "api.open-meteo.com") {
      return Response.json({ minutely_15: { time: [nowEpoch - 300], precipitation: [0] } });
    }
    const state = stations[url.searchParams.get("stationId")!];
    if (state === "missing") return new Response(null, { status: 204 });
    const epoch = state === "online" ? nowEpoch - 120 : nowEpoch - 3600;
    return Response.json({
      observations: [{ epoch, metric: { precipRate: 0, precipTotal: 0 } }],
    });
  });
}

beforeEach(resetApiKeyCache);

describe("getFieldWeather", () => {
  it("uses the closest station when it is online", async () => {
    const fetch = mockFetch({ IGUATE56: "online", IGUATE57: "online" });
    const weather = await getFieldWeather(charcas, { now: NOW, fetch });
    expect(weather.series.source).toMatchObject({ kind: "pws", stationId: "IGUATE56" });
    expect(weather.skipped).toEqual([]);
  });

  it("falls back to the next station", async () => {
    const fetch = mockFetch({ IGUATE56: "stale", IGUATE57: "online" });
    const weather = await getFieldWeather(charcas, { now: NOW, fetch });
    expect(weather.series.source).toMatchObject({ kind: "pws", stationId: "IGUATE57" });
    expect(weather.skipped).toEqual([expect.stringMatching(/^IGUATE56: .*last reported/)]);
  });

  it("falls back to Open-Meteo when no station works", async () => {
    const fetch = mockFetch({ IGUATE56: "missing", IGUATE57: "stale" });
    const weather = await getFieldWeather(charcas, { now: NOW, fetch });
    expect(weather.series.source.kind).toBe("open-meteo");
    expect(weather.skipped).toHaveLength(2);
    expect(weather.status.isRaining).toBe(false);
  });
});
