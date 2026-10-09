import { TIME_ZONE } from "@/config/locations";
import { startOfGuatemalaDay } from "@/lib/time";

/** Non-breaking space, so "12 mm", "25 min" and "2:05 p. m." never wrap mid-value. */
const NBSP = "\u00a0";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * "2:05 p. m." in Guatemala time. Built by hand so the server and the browser
 * render the same text regardless of their ICU versions.
 */
export function formatTime(date: Date | string): string {
  const parts = partsFormatter.formatToParts(new Date(date));
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  const minute = parts.find((p) => p.type === "minute")!.value;
  return `${hour % 12 || 12}:${minute}${NBSP}${hour < 12 ? "a." : "p."}${NBSP}m.`;
}

/** "45 min", "1 h", "2 h 10 min". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  if (totalMinutes < 1) return `menos de 1${NBSP}min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}${NBSP}min`;
  return minutes === 0 ? `${hours}${NBSP}h` : `${hours}${NBSP}h ${minutes}${NBSP}min`;
}

/** "12.5 mm", "0 mm". */
export function formatMm(mm: number): string {
  return `${mm.toLocaleString("en-US", { maximumFractionDigits: 1 })}${NBSP}mm`;
}

/** "hoy", "ayer" or "el 6/10", relative to `now`, in Guatemala time. */
export function formatDay(date: Date | string, now: Date | number): string {
  const day = startOfGuatemalaDay(new Date(date)).getTime();
  const today = startOfGuatemalaDay(new Date(now)).getTime();
  if (day === today) return "hoy";
  if (today - day === 86_400_000) return "ayer";
  const [, month, dayOfMonth] = new Date(day + 6 * 3_600_000).toISOString().split(/[-T]/);
  return `el ${Number(dayOfMonth)}/${Number(month)}`;
}

/** "a 1.7 km" or "junto al campo" for stations closer than 500 m. */
export function formatDistance(km: number): string {
  return km < 0.5 ? "junto al campo" : `a ${km.toFixed(1)} km`;
}
