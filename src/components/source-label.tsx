import { formatDistance } from "@/lib/format";
import type { WeatherSource } from "@/lib/weather/types";

export function SourceLabel({ source, skipped }: { source: WeatherSource; skipped: string[] }) {
  const isStation = source.kind === "pws";
  const skippedStations = skipped.map((reason) => reason.split(":")[0]);

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="text-muted">Fuente:</span>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium underline-offset-2 hover:underline ${
            isStation
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          }`}
        >
          {isStation ? `Estación ${source.stationId}` : "Open-Meteo"}
          <span aria-hidden="true">↗</span>
        </a>
        <span className="text-muted">
          {isStation
            ? `Wunderground · ${formatDistance(source.distanceKm)}`
            : "estimación por modelo, menos precisa"}
        </span>
      </div>
      {skippedStations.length > 0 && (
        <p className="text-muted" title={skipped.join("\n")}>
          Sin datos de: {skippedStations.join(", ")}
        </p>
      )}
    </div>
  );
}
