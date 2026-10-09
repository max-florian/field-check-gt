import { startOfGuatemalaDay } from "@/lib/time";
import type { PrecipSample, PrecipSeries } from "./types";

const MINUTE_MS = 60 * 1000;

/** Rain is at least this much within a window (0.5 mm in 15 min ≈ 2 mm/h). Less is drizzle. */
export const RAIN_WINDOW_MS = 15 * MINUTE_MS;
export const MIN_RAIN_MM_PER_WINDOW = 0.5;
/** A dry stretch this long ends a rain episode. */
export const DRY_GAP_MS = 15 * MINUTE_MS;

/** Rain in this window before the latest observation decides whether the field is playable. */
export const RECENT_WINDOW_MS = 3 * 60 * MINUTE_MS;
export const DOUBTFUL_RECENT_MM = 3;
export const UNPLAYABLE_RECENT_MM = 10;

export type Playability = "playable" | "doubtful" | "unplayable";

export type RainEpisode = {
  start: Date;
  end: Date;
  mm: number;
};

export type RainStatus = {
  isRaining: boolean;
  /** The ongoing episode when raining, otherwise the most recent one, if any. */
  lastEpisode: RainEpisode | null;
  todayMm: number;
  /** Rain in the last 3 hours, drizzle included. */
  recentMm: number;
  playability: Playability;
  observedAt: Date;
};

/** Marks the samples that are part of real rain (not drizzle). */
function findWetSamples(samples: PrecipSample[]): boolean[] {
  const wet = samples.map(() => false);
  for (let i = 0; i < samples.length; i++) {
    const windowStart = samples[i].end.getTime() - RAIN_WINDOW_MS;
    let mm = 0;
    let first = i;
    for (let j = i; j >= 0 && samples[j].end.getTime() > windowStart; j--) {
      mm += samples[j].mm;
      first = j;
    }
    if (mm >= MIN_RAIN_MM_PER_WINDOW) {
      for (let j = first; j <= i; j++) if (samples[j].mm > 0) wet[j] = true;
    }
  }
  return wet;
}

export function findRainEpisodes(samples: PrecipSample[]): RainEpisode[] {
  const wet = findWetSamples(samples);
  const episodes: { first: number; last: number }[] = [];

  samples.forEach((sample, i) => {
    if (!wet[i]) return;
    const current = episodes.at(-1);
    if (current && sample.start.getTime() - samples[current.last].end.getTime() < DRY_GAP_MS) {
      current.last = i;
    } else {
      episodes.push({ first: i, last: i });
    }
  });

  return episodes.map(({ first, last }) => ({
    start: samples[first].start,
    end: samples[last].end,
    mm: sumMm(samples.slice(first, last + 1)),
  }));
}

const sumMm = (samples: PrecipSample[]) =>
  Math.round(samples.reduce((total, s) => total + s.mm, 0) * 100) / 100;

export function analyzeRain(series: PrecipSeries): RainStatus {
  const { samples, observedAt } = series;
  const lastEpisode = findRainEpisodes(samples).at(-1) ?? null;
  const isRaining =
    lastEpisode !== null && observedAt.getTime() - lastEpisode.end.getTime() < DRY_GAP_MS;
  const midnight = startOfGuatemalaDay(observedAt);
  const recentStart = observedAt.getTime() - RECENT_WINDOW_MS;
  const recentMm = sumMm(samples.filter((s) => s.end.getTime() > recentStart));

  return {
    isRaining,
    lastEpisode,
    todayMm: sumMm(samples.filter((s) => s.end > midnight)),
    recentMm,
    playability: assessPlayability(isRaining, recentMm),
    observedAt,
  };
}

/** A rough estimate from rainfall alone; drainage differs from field to field. */
export function assessPlayability(isRaining: boolean, recentMm: number): Playability {
  if (isRaining || recentMm >= UNPLAYABLE_RECENT_MM) return "unplayable";
  if (recentMm >= DOUBTFUL_RECENT_MM) return "doubtful";
  return "playable";
}
