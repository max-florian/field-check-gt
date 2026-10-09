import type { FieldLocation } from "@/config/locations";
import { type FieldWeather, getFieldWeather } from "./index";
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
      observedAt: string;
      forecast: { start: string; end: string; mm: number }[];
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
  const { series, status, skipped } = weather;
  return {
    slug: location.slug,
    name: location.name,
    area: location.area,
    ok: true,
    source: series.source,
    isRaining: status.isRaining,
    lastEpisode: status.lastEpisode && sampleToJson(status.lastEpisode),
    todayMm: status.todayMm,
    observedAt: status.observedAt.toISOString(),
    forecast: series.forecast.map(sampleToJson),
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
