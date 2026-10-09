import {
  type FieldLocation,
  LOCATIONS,
  type Station,
  stationDistanceKm,
  wundergroundStationUrl,
} from "@/config/locations";
import { startOfGuatemalaDay } from "@/lib/time";
import type { PrecipSample, PrecipSeries, ProviderOptions } from "./types";

const API_BASE = "https://api.weather.com/v2/pws/observations/all/1day";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

/** A station whose latest observation is older than this is considered offline. */
export const MAX_OBSERVATION_AGE_MS = 20 * 60 * 1000;

type Observation = {
  epoch: number;
  metric: { precipRate: number | null; precipTotal: number | null };
};

const ALL_STATION_IDS = LOCATIONS.flatMap((location) => location.stations.map((s) => s.id));

/** The last key that worked, reused until the API rejects it. */
let cachedApiKey: string | null = null;

export function resetApiKeyCache() {
  cachedApiKey = null;
}

/** The dashboard page embeds several keys; only some are authorized for PWS data. */
export function extractApiKeys(html: string): string[] {
  const keys = [...html.matchAll(/apiKey=([a-f0-9]{32})/g)].map((match) => match[1]);
  return [...new Set(keys)];
}

function observationsUrl(stationId: string, apiKey: string) {
  const params = new URLSearchParams({
    stationId,
    format: "json",
    units: "m",
    numericPrecision: "decimal",
    apiKey,
  });
  return `${API_BASE}?${params}`;
}

async function scrapeApiKeys(stationId: string, fetchFn: typeof fetch): Promise<string[]> {
  const page = await fetchFn(wundergroundStationUrl(stationId), {
    headers: { "User-Agent": BROWSER_USER_AGENT },
  });
  if (!page.ok) throw new Error(`returned ${page.status}`);
  return extractApiKeys(await page.text());
}

/** Returns the status code when the key is not authorized, so the caller can try the next one. */
async function fetchWithKey(
  stationId: string,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<Observation[] | number> {
  const response = await fetchFn(observationsUrl(stationId, apiKey));
  if (response.status === 401 || response.status === 403) return response.status;
  if (response.status === 204) throw new Error(`${stationId} has no observations today`);
  if (!response.ok) throw new Error(`Weather.com API returned ${response.status}`);
  const body = (await response.json()) as { observations?: Observation[] };
  return body.observations ?? [];
}

async function fetchObservations(
  stationId: string,
  fetchFn: typeof fetch,
): Promise<Observation[]> {
  if (cachedApiKey) {
    const result = await fetchWithKey(stationId, cachedApiKey, fetchFn);
    if (typeof result !== "number") return result;
    cachedApiKey = null;
  }

  // Keys aren't tied to a station, and some pages only embed a key that gets rejected,
  // so the other configured stations' pages are searched too.
  const pages = [stationId, ...ALL_STATION_IDS.filter((id) => id !== stationId)];
  const triedKeys = new Set<string>();
  const failures: string[] = [];
  for (const page of pages) {
    let keys: string[];
    try {
      keys = await scrapeApiKeys(page, fetchFn);
    } catch (error) {
      failures.push(`${page} page: ${(error as Error).message}`);
      continue;
    }
    for (const apiKey of keys.filter((key) => !triedKeys.has(key))) {
      triedKeys.add(apiKey);
      const result = await fetchWithKey(stationId, apiKey, fetchFn);
      if (typeof result !== "number") {
        cachedApiKey = apiKey;
        return result;
      }
      failures.push(`key from ${page}: ${result}`);
    }
  }
  throw new Error(`No Wunderground API key was authorized (${failures.join("; ")})`);
}

/**
 * Turns the cumulative daily `precipTotal` into per-interval amounts. `precipRate`
 * is ignored: it gets stuck at the last tip's rate for hours during drizzle.
 */
export function observationsToSamples(observations: Observation[]): PrecipSample[] {
  const samples: PrecipSample[] = [];
  let previous: { time: Date; total: number } | null = null;

  for (const observation of [...observations].sort((a, b) => a.epoch - b.epoch)) {
    const total = observation.metric.precipTotal;
    if (total == null) continue;
    const time = new Date(observation.epoch * 1000);
    if (previous) {
      // The total resets at local midnight, so a drop means a new day started.
      const mm = total >= previous.total ? total - previous.total : total;
      samples.push({ start: previous.time, end: time, mm: round(mm) });
    } else if (total > 0) {
      // Rain between midnight and the first observation of the day.
      samples.push({ start: startOfGuatemalaDay(time), end: time, mm: round(total) });
    }
    previous = { time, total };
  }
  return samples;
}

const round = (mm: number) => Math.round(mm * 100) / 100;

export async function fetchPwsSeries(
  location: FieldLocation,
  station: Station,
  { now = new Date(), fetch: fetchFn = fetch }: ProviderOptions = {},
): Promise<PrecipSeries> {
  const observations = await fetchObservations(station.id, fetchFn);
  const withGauge = observations.filter((o) => o.metric.precipTotal != null);
  if (withGauge.length === 0) throw new Error(`${station.id} has no rain gauge data`);

  const observedAt = new Date(Math.max(...withGauge.map((o) => o.epoch)) * 1000);
  if (now.getTime() - observedAt.getTime() > MAX_OBSERVATION_AGE_MS) {
    throw new Error(`${station.id} last reported at ${observedAt.toISOString()}`);
  }

  return {
    source: {
      kind: "pws",
      stationId: station.id,
      distanceKm: round(stationDistanceKm(location, station)),
      url: wundergroundStationUrl(station.id),
    },
    samples: observationsToSamples(withGauge),
    observedAt,
  };
}
