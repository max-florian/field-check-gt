import { describe, expect, it } from "vitest";
import { summarizeForecast } from "./forecast";
import type { ForecastSample } from "./types";

const at = (hhmm: string) => new Date(`2026-10-08T${hhmm}:00-06:00`);

/** Consecutive 15-minute intervals starting at 22:15, from mm amounts. */
function forecast(amounts: number[], probability: number | null = 50): ForecastSample[] {
  return amounts.map((mm, i) => {
    const start = new Date(at("22:15").getTime() + i * 15 * 60_000);
    return { start, end: new Date(start.getTime() + 15 * 60_000), mm, probability };
  });
}

describe("summarizeForecast", () => {
  it("returns null without forecast data", () => {
    expect(summarizeForecast([], false)).toBeNull();
  });

  it("finds when rain is expected to start, ignoring drizzle", () => {
    const summary = summarizeForecast(forecast([0, 0.2, 0.3, 0.8, 1]), false)!;
    expect(summary.rainStartsAt).toEqual(at("23:00"));
    expect(summary.rainStopsAt).toBeNull();
    expect(summary.totalMm).toBe(2.3);
    expect(summary.until).toEqual(at("23:30"));
  });

  it("reports no rain when only drizzle is forecast", () => {
    expect(summarizeForecast(forecast([0.1, 0.4, 0.2]), false)!.rainStartsAt).toBeNull();
  });

  it("finds when ongoing rain is expected to stop", () => {
    const summary = summarizeForecast(forecast([1.2, 0.6, 0.2, 0]), true)!;
    expect(summary.rainStopsAt).toEqual(at("22:45"));
    expect(summary.rainStartsAt).toBeNull();
  });

  it("reports rain continuing through the whole window", () => {
    expect(summarizeForecast(forecast([1, 1, 1]), true)!.rainStopsAt).toBeNull();
  });

  it("keeps the highest probability", () => {
    const samples = [...forecast([0], 30), ...forecast([0], 80), ...forecast([0], null)];
    expect(summarizeForecast(samples, false)!.maxProbability).toBe(80);
    expect(summarizeForecast(forecast([0], null), false)!.maxProbability).toBeNull();
  });
});
