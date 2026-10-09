// Prints the live rain status of every field: npm run check:weather
import { LOCATIONS, TIME_ZONE } from "@/config/locations";
import { getFieldWeather } from "@/lib/weather";
import { findRainEpisodes } from "@/lib/weather/rain";

const time = (date: Date) =>
  date.toLocaleTimeString("es-GT", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

for (const location of LOCATIONS) {
  const { series, status, skipped } = await getFieldWeather(location);
  const source =
    series.source.kind === "pws"
      ? `PWS ${series.source.stationId} (${series.source.distanceKm} km)`
      : "Open-Meteo";
  console.log(`\n${location.name} — ${source}, dato de las ${time(status.observedAt)}`);
  for (const reason of skipped) console.log(`  omitida ${reason}`);
  console.log(`  lloviendo: ${status.isRaining ? "sí" : "no"} | hoy: ${status.todayMm} mm`);
  for (const episode of findRainEpisodes(series.samples)) {
    console.log(`  lluvia ${time(episode.start)} – ${time(episode.end)}: ${episode.mm} mm`);
  }
}
