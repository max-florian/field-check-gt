import { type FieldLocation, openMeteoUrl } from "@/config/locations";
import type { PrecipSample, PrecipSeries, ProviderOptions } from "./types";

const API_URL = "https://api.open-meteo.com/v1/forecast";
const INTERVAL_MS = 15 * 60 * 1000;

type OpenMeteoResponse = {
  minutely_15?: { time: number[]; precipitation: (number | null)[] };
};

export async function fetchOpenMeteoSeries(
  location: FieldLocation,
  { now = new Date(), fetch: fetchFn = fetch }: ProviderOptions = {},
): Promise<PrecipSeries> {
  const params = new URLSearchParams({
    latitude: String(location.coordinates.lat),
    longitude: String(location.coordinates.lon),
    minutely_15: "precipitation",
    past_minutely_15: "96",
    forecast_minutely_15: "8",
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
  const forecast = all.filter((s) => s.end > now);
  if (samples.length === 0) throw new Error("Open-Meteo returned no past data");

  return {
    source: { kind: "open-meteo", url: openMeteoUrl(location.coordinates) },
    samples,
    forecast,
    observedAt: samples[samples.length - 1].end,
  };
}
