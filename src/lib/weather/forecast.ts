import { MIN_RAIN_MM_PER_WINDOW } from "./rain";
import type { ForecastSample } from "./types";

export type ForecastSummary = {
  /** End of the forecast window. */
  until: Date;
  /** When dry: start of the first interval with rain (not drizzle), if any. */
  rainStartsAt: Date | null;
  /** When raining: start of the first dry interval, if any. */
  rainStopsAt: Date | null;
  totalMm: number;
  /** Highest chance of rain in the window, in percent. */
  maxProbability: number | null;
};

// Forecast intervals are 15 minutes long, the same as the rain window.
const isRainy = (sample: ForecastSample) => sample.mm >= MIN_RAIN_MM_PER_WINDOW;

export function summarizeForecast(
  forecast: ForecastSample[],
  isRaining: boolean,
): ForecastSummary | null {
  if (forecast.length === 0) return null;
  const probabilities = forecast.flatMap((s) => (s.probability == null ? [] : [s.probability]));

  return {
    until: forecast[forecast.length - 1].end,
    rainStartsAt: isRaining ? null : (forecast.find(isRainy)?.start ?? null),
    rainStopsAt: isRaining ? (forecast.find((s) => !isRainy(s))?.start ?? null) : null,
    totalMm: Math.round(forecast.reduce((total, s) => total + s.mm, 0) * 10) / 10,
    maxProbability: probabilities.length > 0 ? Math.max(...probabilities) : null,
  };
}
