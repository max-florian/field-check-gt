import type { FieldLocation } from "@/config/locations";
import { type ForecastSummary, summarizeForecast } from "./forecast";
import { type OpenMeteoData, fetchOpenMeteo } from "./open-meteo";
import { type RainStatus, analyzeRain } from "./rain";
import type { PrecipSeries, ProviderOptions } from "./types";
import { fetchPwsSeries } from "./wunderground";

export type FieldWeather = {
  series: PrecipSeries;
  status: RainStatus;
  /** Open-Meteo's next 2 hours, or null when it is unavailable. */
  forecast: ForecastSummary | null;
  forecastUrl: string | null;
  /** Why earlier sources in the fallback chain were skipped. */
  skipped: string[];
};

/**
 * Tries each PWS in order, then Open-Meteo. Open-Meteo is always requested, in
 * parallel, because it also provides the forecast.
 */
export async function getFieldWeather(
  location: FieldLocation,
  options: ProviderOptions = {},
): Promise<FieldWeather> {
  const openMeteo: Promise<OpenMeteoData | Error> = fetchOpenMeteo(location, options).catch(
    (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
  );
  const skipped: string[] = [];

  const withForecast = async (series: PrecipSeries): Promise<FieldWeather> => {
    const status = analyzeRain(series);
    const model = await openMeteo;
    const ok = !(model instanceof Error);
    return {
      series,
      status,
      forecast: ok ? summarizeForecast(model.forecast, status.isRaining) : null,
      forecastUrl: ok ? model.series.source.url : null,
      skipped,
    };
  };

  for (const station of location.stations) {
    try {
      return await withForecast(await fetchPwsSeries(location, station, options));
    } catch (error) {
      skipped.push(`${station.id}: ${errorMessage(error)}`);
    }
  }

  const model = await openMeteo;
  if (model instanceof Error) throw model;
  return withForecast(model.series);
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export type { ForecastSample, PrecipSample, PrecipSeries, WeatherSource } from "./types";
export type { ForecastSummary } from "./forecast";
export type { RainEpisode, RainStatus } from "./rain";
