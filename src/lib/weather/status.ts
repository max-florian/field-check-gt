import type { FieldLocation } from "@/config/locations";
import { type FieldWeather, getFieldWeather } from "./index";
import type { Playability } from "./rain";
import type { PrecipSample, ProviderOptions, WeatherSource } from "./types";

/** Serializable status of one field, as served by /api/estado. */
export type FieldStatus = {
  slug: string;
  name: string;
  area: string;
} & (
  | {
      ok: true;
      source: WeatherSource;
      isRaining: boolean;
      /** The ongoing episode when raining, otherwise the most recent one. */
      lastEpisode: { start: string; end: string; mm: number } | null;
      todayMm: number;
      /** Rain in the last 3 hours. */
      recentMm: number;
      playability: Playability;
      observedAt: string;
      /** Open-Meteo's next 2 hours; null when unavailable. */
      forecast: {
        until: string;
        rainStartsAt: string | null;
        rainStopsAt: string | null;
        totalMm: number;
        maxProbability: number | null;
        url: string;
      } | null;
      /** Why sources earlier in the fallback chain were skipped. */
      skipped: string[];
    }
  | { ok: false; error: string }
);

export type StatusResponse = {
  generatedAt: string;
  fields: FieldStatus[];
};

const sampleToJson = ({ start, end, mm }: PrecipSample) => ({
  start: start.toISOString(),
  end: end.toISOString(),
  mm,
});

export function toFieldStatus(location: FieldLocation, weather: FieldWeather): FieldStatus {
  const { series, status, forecast, forecastUrl, skipped } = weather;
  return {
    slug: location.slug,
    name: location.name,
    area: location.area,
    ok: true,
    source: series.source,
    isRaining: status.isRaining,
    lastEpisode: status.lastEpisode && sampleToJson(status.lastEpisode),
    todayMm: status.todayMm,
    recentMm: status.recentMm,
    playability: status.playability,
    observedAt: status.observedAt.toISOString(),
    forecast:
      forecast && forecastUrl
        ? {
            until: forecast.until.toISOString(),
            rainStartsAt: forecast.rainStartsAt?.toISOString() ?? null,
            rainStopsAt: forecast.rainStopsAt?.toISOString() ?? null,
            totalMm: forecast.totalMm,
            maxProbability: forecast.maxProbability,
            url: forecastUrl,
          }
        : null,
    skipped,
  };
}

export async function getFieldStatus(
  location: FieldLocation,
  options: ProviderOptions = {},
): Promise<FieldStatus> {
  try {
    return toFieldStatus(location, await getFieldWeather(location, options));
  } catch (error) {
    return {
      slug: location.slug,
      name: location.name,
      area: location.area,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
