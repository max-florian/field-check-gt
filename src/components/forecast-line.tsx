import { formatDuration, formatMm, formatTime } from "@/lib/format";
import type { FieldStatus } from "@/lib/weather/status";

type Forecast = NonNullable<Extract<FieldStatus, { ok: true }>["forecast"]>;

type Props = { forecast: Forecast; isRaining: boolean; now: number | null };

export function ForecastLine({ forecast, isRaining, now }: Props) {
  const { rainStartsAt, rainStopsAt, until, totalMm, maxProbability, url } = forecast;
  const expectsRain = rainStartsAt !== null || (isRaining && rainStopsAt === null);

  // Rendered inside the rain status box, below a divider.
  return (
    <section aria-label="Pronóstico" className="mt-3 border-t border-current/15 pt-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        Pronóstico · próximas 2 horas
      </p>
      <p className="mt-1 flex gap-1.5 font-medium">
        <span aria-hidden="true">{expectsRain ? "🌧️" : "🌤️"}</span>
        <span>
          {isRaining ? (
            rainStopsAt ? (
              <>
                Podría parar cerca de las {formatTime(rainStopsAt)}
                <In time={rainStopsAt} now={now} />
              </>
            ) : (
              <>Seguiría lloviendo hasta después de las {formatTime(until)}</>
            )
          ) : rainStartsAt ? (
            <>
              Lluvia probable desde las {formatTime(rainStartsAt)}
              <In time={rainStartsAt} now={now} />
            </>
          ) : (
            <>Sin lluvia prevista hasta las {formatTime(until)}</>
          )}
        </span>
      </p>
      <p className="mt-1 text-xs opacity-70">
        {maxProbability !== null && <>Probabilidad de lluvia hasta {maxProbability}% · </>}
        {totalMm > 0 && <>{formatMm(totalMm)} esperados · </>}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Open-Meteo ↗
        </a>
      </p>
    </section>
  );
}

/** " (en 25 min)", only in the browser where the current time is known. */
function In({ time, now }: { time: string; now: number | null }) {
  if (now === null) return null;
  const ms = new Date(time).getTime() - now;
  return <> ({ms > 60_000 ? `en ${formatDuration(ms)}` : "en cualquier momento"})</>;
}
