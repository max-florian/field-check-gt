/** Rain that fell during one interval, normalized across sources. */
export type PrecipSample = {
  start: Date;
  end: Date;
  mm: number;
};

/** A modeled upcoming interval, with the chance of rain in its hour when known. */
export type ForecastSample = PrecipSample & { probability: number | null };

export type WeatherSource =
  | { kind: "pws"; stationId: string; distanceKm: number; url: string }
  | { kind: "open-meteo"; url: string };

export type PrecipSeries = {
  source: WeatherSource;
  /** Observed (or, for Open-Meteo, modeled) intervals up to now, oldest first. */
  samples: PrecipSample[];
  /** When the source last reported. */
  observedAt: Date;
};

export type FetchFn = typeof fetch;

export type ProviderOptions = {
  now?: Date;
  fetch?: FetchFn;
};
