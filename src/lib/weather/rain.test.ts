import { describe, expect, it } from "vitest";
import { analyzeRain, findRainEpisodes } from "./rain";
import type { PrecipSample, PrecipSeries } from "./types";

/** Guatemala local time (UTC-6) on 2026-10-08. */
const at = (hhmm: string) => new Date(`2026-10-08T${hhmm}:00-06:00`);

/** Builds 5-minute samples from "HH:MM" end times to mm, filling gaps with zeros. */
function fiveMinuteSamples(from: string, to: string, rain: Record<string, number>) {
  const samples: PrecipSample[] = [];
  for (let end = at(from).getTime() + 5 * 60_000; end <= at(to).getTime(); end += 5 * 60_000) {
    const endDate = new Date(end);
    const hhmm = endDate.toLocaleTimeString("en-GB", {
      timeZone: "America/Guatemala",
      hour: "2-digit",
      minute: "2-digit",
    });
    samples.push({ start: new Date(end - 5 * 60_000), end: endDate, mm: rain[hhmm] ?? 0 });
  }
  return samples;
}

const series = (samples: PrecipSample[], observedAt = samples.at(-1)!.end): PrecipSeries => ({
  source: { kind: "open-meteo", url: "https://open-meteo.com" },
  samples,
  forecast: [],
  observedAt,
});

describe("findRainEpisodes", () => {
  it("finds nothing on a dry day", () => {
    expect(findRainEpisodes(fiveMinuteSamples("10:00", "12:00", {}))).toEqual([]);
  });

  it("ignores drizzle: isolated gauge tips", () => {
    const samples = fiveMinuteSamples("10:00", "12:00", {
      "10:20": 0.25,
      "10:40": 0.25,
      "11:00": 0.25,
      "11:20": 0.25,
    });
    expect(findRainEpisodes(samples)).toEqual([]);
  });

  it("finds a downpour", () => {
    const samples = fiveMinuteSamples("13:00", "16:00", {
      "14:05": 3.56,
      "14:10": 4.82,
      "14:15": 3.05,
      "14:20": 0.25,
      "14:25": 0.51,
    });
    expect(findRainEpisodes(samples)).toEqual([
      { start: at("14:00"), end: at("14:25"), mm: 12.19 },
    ]);
  });

  it("includes the light tip that led into the rain", () => {
    const samples = fiveMinuteSamples("10:00", "11:00", { "10:10": 0.25, "10:15": 0.25 });
    expect(findRainEpisodes(samples)).toEqual([{ start: at("10:05"), end: at("10:15"), mm: 0.5 }]);
  });

  it("merges rain separated by less than 15 dry minutes", () => {
    const samples = fiveMinuteSamples("10:00", "12:00", {
      "10:10": 1,
      "10:15": 1,
      // 10 dry minutes
      "10:30": 1,
    });
    expect(findRainEpisodes(samples)).toEqual([{ start: at("10:05"), end: at("10:30"), mm: 3 }]);
  });

  it("splits rain separated by 15 or more dry minutes", () => {
    const samples = fiveMinuteSamples("10:00", "12:00", {
      "10:10": 1,
      // 15 dry minutes
      "10:30": 1,
    });
    expect(findRainEpisodes(samples)).toEqual([
      { start: at("10:05"), end: at("10:10"), mm: 1 },
      { start: at("10:25"), end: at("10:30"), mm: 1 },
    ]);
  });

  it("applies the same threshold to 15-minute model data", () => {
    const quarter = (end: string, mm: number): PrecipSample => ({
      start: new Date(at(end).getTime() - 15 * 60_000),
      end: at(end),
      mm,
    });
    expect(findRainEpisodes([quarter("10:15", 0.3), quarter("10:30", 0.3)])).toEqual([]);
    expect(findRainEpisodes([quarter("10:15", 0.3), quarter("10:30", 0.5)])).toEqual([
      { start: at("10:15"), end: at("10:30"), mm: 0.5 },
    ]);
  });
});

describe("analyzeRain", () => {
  it("reports ongoing rain", () => {
    const samples = fiveMinuteSamples("14:00", "15:00", { "14:40": 1, "14:50": 1, "14:55": 0.5 });
    const status = analyzeRain(series(samples));
    expect(status.isRaining).toBe(true);
    expect(status.lastEpisode?.start).toEqual(at("14:35"));
  });

  it("keeps reporting rain during a short pause", () => {
    const samples = fiveMinuteSamples("14:00", "15:00", { "14:45": 1, "14:50": 1 });
    expect(analyzeRain(series(samples)).isRaining).toBe(true);
  });

  it("reports that rain stopped after 15 dry minutes", () => {
    const samples = fiveMinuteSamples("14:00", "15:00", { "14:40": 1, "14:45": 1 });
    const status = analyzeRain(series(samples));
    expect(status.isRaining).toBe(false);
    expect(status.lastEpisode).toEqual({ start: at("14:35"), end: at("14:45"), mm: 2 });
  });

  it("counts today's rain since local midnight, drizzle included", () => {
    const yesterday = fiveMinuteSamples("23:00", "23:55", { "23:30": 5 }).map((s) => ({
      ...s,
      start: new Date(s.start.getTime() - 86_400_000),
      end: new Date(s.end.getTime() - 86_400_000),
    }));
    const today = fiveMinuteSamples("00:00", "12:00", { "09:00": 0.25, "10:00": 2 });
    expect(analyzeRain(series([...yesterday, ...today])).todayMm).toBe(2.25);
  });
});
