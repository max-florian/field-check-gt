import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocation } from "@/config/locations";
import {
  extractApiKeys,
  fetchPwsSeries,
  observationsToSamples,
  resetApiKeyCache,
} from "./wunderground";

const GOOD_KEY = "a".repeat(32);
const BAD_KEY = "b".repeat(32);
const PAGE = `<script src="x?apiKey=${BAD_KEY}"></script><a href="y?apiKey=${GOOD_KEY}&x=1">
  <a href="z?apiKey=${BAD_KEY}">`;

const campoMarte = getLocation("campo-marte")!;
const station = campoMarte.stations[0];

/** Epoch seconds for a Guatemala local time on 2026-10-08. */
const epoch = (hhmm: string) => new Date(`2026-10-08T${hhmm}:00-06:00`).getTime() / 1000;

const observation = (hhmm: string, precipTotal: number | null) => ({
  epoch: epoch(hhmm),
  metric: { precipRate: 1.78, precipTotal },
});

// Shape and values taken from IGUATE37's real response on 2026-10-08.
const OBSERVATIONS = [
  observation("13:59", 0),
  observation("14:04", 3.56),
  observation("14:09", 8.38),
  observation("14:14", 11.43),
  observation("14:19", 11.68),
];

function mockFetch(observations = OBSERVATIONS) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith("https://www.wunderground.com/")) return new Response(PAGE);
    if (url.includes(`apiKey=${GOOD_KEY}`)) return Response.json({ observations });
    return new Response("apikey is not authorized for this product", { status: 401 });
  });
}

const NOW = new Date(epoch("14:25") * 1000);

beforeEach(resetApiKeyCache);

describe("extractApiKeys", () => {
  it("returns unique keys in page order", () => {
    expect(extractApiKeys(PAGE)).toEqual([BAD_KEY, GOOD_KEY]);
  });
});

describe("observationsToSamples", () => {
  it("turns the cumulative total into per-interval amounts", () => {
    expect(observationsToSamples(OBSERVATIONS).map((s) => s.mm)).toEqual([3.56, 4.82, 3.05, 0.25]);
  });

  it("handles the midnight reset and rain before the first observation", () => {
    const samples = observationsToSamples([
      observation("00:04", 0.25),
      observation("00:09", 0.51),
    ]);
    expect(samples.map((s) => s.mm)).toEqual([0.25, 0.26]);
    expect(samples[0].start).toEqual(new Date("2026-10-08T00:00:00-06:00"));

    const acrossMidnight = observationsToSamples([
      { epoch: epoch("00:00") - 300, metric: { precipRate: 0, precipTotal: 18.03 } },
      observation("00:04", 0.25),
    ]);
    expect(acrossMidnight.at(-1)?.mm).toBe(0.25);
  });

  it("skips observations without a gauge reading", () => {
    const samples = observationsToSamples([observation("10:00", 0), observation("10:05", null)]);
    expect(samples).toEqual([]);
  });
});

describe("fetchPwsSeries", () => {
  it("tries every key in the page until one is authorized", async () => {
    const fetch = mockFetch();
    const series = await fetchPwsSeries(campoMarte, station, { now: NOW, fetch });

    expect(series.source).toMatchObject({ kind: "pws", stationId: "IGUATE37", distanceKm: 0 });
    expect(series.source.url).toBe("https://www.wunderground.com/dashboard/pws/IGUATE37");
    expect(series.samples).toHaveLength(4);
    expect(series.observedAt).toEqual(new Date(epoch("14:19") * 1000));
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("reuses the working key without fetching the page again", async () => {
    await fetchPwsSeries(campoMarte, station, { now: NOW, fetch: mockFetch() });
    const fetch = mockFetch();
    await fetchPwsSeries(campoMarte, station, { now: NOW, fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a station that stopped reporting", async () => {
    const later = new Date(epoch("14:40") * 1000);
    await expect(
      fetchPwsSeries(campoMarte, station, { now: later, fetch: mockFetch() }),
    ).rejects.toThrow("last reported");
  });

  it("rejects a station without a rain gauge", async () => {
    const fetch = mockFetch([observation("14:19", null)]);
    await expect(fetchPwsSeries(campoMarte, station, { now: NOW, fetch })).rejects.toThrow(
      "no rain gauge",
    );
  });

  it("looks for a working key in other stations' pages", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/IGUATE37")) return new Response(`apiKey=${BAD_KEY}`);
      if (url.startsWith("https://www.wunderground.com/")) return new Response(PAGE);
      if (url.includes(`apiKey=${GOOD_KEY}`)) return Response.json({ observations: OBSERVATIONS });
      return new Response(null, { status: 401 });
    });
    const series = await fetchPwsSeries(campoMarte, station, { now: NOW, fetch });

    expect(series.samples).toHaveLength(4);
    expect(fetch.mock.calls.map(([input]) => String(input).split("?")[0])).toEqual([
      "https://www.wunderground.com/dashboard/pws/IGUATE37",
      "https://api.weather.com/v2/pws/observations/all/1day",
      "https://www.wunderground.com/dashboard/pws/IGUATE56",
      "https://api.weather.com/v2/pws/observations/all/1day",
    ]);
  });

  it("fails when no key is authorized", async () => {
    const fetch = vi.fn(async (input: string | URL | Request) =>
      String(input).startsWith("https://www.wunderground.com/")
        ? new Response(`apiKey=${BAD_KEY}`)
        : new Response(null, { status: 401 }),
    );
    await expect(fetchPwsSeries(campoMarte, station, { now: NOW, fetch })).rejects.toThrow(
      "No Wunderground API key was authorized",
    );
  });
});
