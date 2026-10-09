import { type FieldLocation, openMeteoUrl } from "@/config/locations";
import type { ForecastSample, PrecipSample, PrecipSeries, ProviderOptions } from "./types";

const API_URL = "https://api.open-meteo.com/v1/forecast";
const INTERVAL_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type OpenMeteoResponse = {
  minutely_15?: { time: number[]; precipitation: (number | null)[] };
  hourly?: { time: number[]; precipitation_probability: (number | null)[] };
};

export type OpenMeteoData = {
  /** Modeled rain up to now; used when no station is available. */
  series: PrecipSeries;
  /** The next 2 hours, oldest first. */
  forecast: ForecastSample[];
};

export async function fetchOpenMeteo(
  location: FieldLocation,
  { now = new Date(), fetch: fetchFn = fetch }: ProviderOptions = {},
): Promise<OpenMeteoData> {
  const params = new URLSearchParams({
    latitude: String(location.coordinates.lat),
    longitude: String(location.coordinates.lon),
    minutely_15: "precipitation",
    past_minutely_15: "96",
    forecast_minutely_15: "8",
    hourly: "precipitation_probability",
    past_hours: "1",
    forecast_hours: "3",
    timezone: "GMT",
    timeformat: "unixtime",
  });
  const response = await fetchFn(`${API_URL}?${params}`);
  if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
  const body = (await response.json()) as OpenMeteoResponse;
  if (!body.minutely_15) throw new Error("Open-Meteo response has no minutely_15 data");

  // Each value is the precipitation sum of the 15 minutes before its timestamp.
  const all: PrecipSample[] = body.minutely_15.time.map((epoch, i) => {
    const end = new Date(epoch * 1000);
    return {
      start: new Date(end.getTime() - INTERVAL_MS),
      end,
      mm: body.minutely_15!.precipitation[i] ?? 0,
    };
  });
  const samples = all.filter((s) => s.end <= now);
  if (samples.length === 0) throw new Error("Open-Meteo returned no past data");

  // Hourly probabilities also refer to the hour before their timestamp.
  const hourly = (body.hourly?.time ?? []).map((epoch, i) => ({
    end: epoch * 1000,
    probability: body.hourly!.precipitation_probability[i],
  }));
  const probabilityAt = (end: Date) =>
    hourly.find((h) => end.getTime() > h.end - HOUR_MS && end.getTime() <= h.end)
      ?.probability ?? null;

  return {
    series: {
      source: { kind: "open-meteo", url: openMeteoUrl(location.coordinates) },
      samples,
      observedAt: samples[samples.length - 1].end,
    },
    forecast: all
      .filter((s) => s.end > now)
      .map((s) => ({ ...s, probability: probabilityAt(s.end) })),
  };
}
