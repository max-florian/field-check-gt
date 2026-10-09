import { TIME_ZONE } from "@/config/locations";

// Guatemala has used UTC-6 without daylight saving time since 2006.
const GUATEMALA_UTC_OFFSET = "-06:00";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Local midnight in Guatemala for the day that contains `date`. */
export function startOfGuatemalaDay(date: Date): Date {
  return new Date(`${dateFormatter.format(date)}T00:00:00${GUATEMALA_UTC_OFFSET}`);
}
