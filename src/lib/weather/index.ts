import type { FieldLocation } from "@/config/locations";
import { fetchOpenMeteoSeries } from "./open-meteo";
import { type RainStatus, analyzeRain } from "./rain";
import type { PrecipSeries, ProviderOptions } from "./types";
import { fetchPwsSeries } from "./wunderground";

export type FieldWeather = {
  series: PrecipSeries;
  status: RainStatus;
  /** Why earlier sources in the fallback chain were skipped. */
  skipped: string[];
};

/** Tries each PWS in order, then Open-Meteo. */
export async function getFieldWeather(
  location: FieldLocation,
  options: ProviderOptions = {},
): Promise<FieldWeather> {
  const skipped: string[] = [];

  for (const station of location.stations) {
    try {
      const series = await fetchPwsSeries(location, station, options);
      return { series, status: analyzeRain(series), skipped };
    } catch (error) {
      skipped.push(`${station.id}: ${errorMessage(error)}`);
    }
  }

  const series = await fetchOpenMeteoSeries(location, options);
  return { series, status: analyzeRain(series), skipped };
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export type { PrecipSample, PrecipSeries, WeatherSource } from "./types";
export type { RainEpisode, RainStatus } from "./rain";
