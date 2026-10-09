import { formatDay, formatDuration, formatMm, formatTime } from "@/lib/format";
import type { FieldStatus } from "@/lib/weather/status";
import { SourceLabel } from "./source-label";

/** Data older than this gets a warning. */
const STALE_AFTER_MS = 30 * 60_000;

type Props = { field: FieldStatus; now: number | null };

export function FieldCard({ field, now }: Props) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-semibold">{field.name}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{field.area}</p>
      </header>
      {field.ok ? (
        <FieldWeather field={field} now={now} />
      ) : (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          <p className="font-medium">No se pudo obtener el estado del clima.</p>
          <p className="mt-1 text-xs opacity-80">{field.error}</p>
        </div>
      )}
    </article>
  );
}

function FieldWeather({ field, now }: { field: Extract<FieldStatus, { ok: true }>; now: number | null }) {
  const { isRaining, lastEpisode, todayMm, observedAt } = field;
  const isStale = now !== null && now - new Date(observedAt).getTime() > STALE_AFTER_MS;

  return (
    <>
      <div
        className={`rounded-xl p-4 ${
          isRaining
            ? "bg-sky-100 text-sky-950 dark:bg-sky-500/15 dark:text-sky-100"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        <p className="flex items-center gap-2 text-2xl font-bold">
          <span aria-hidden="true">{isRaining ? "🌧️" : "☁️"}</span>
          {isRaining ? "Lloviendo" : "Sin lluvia"}
        </p>
        <p className="mt-1 text-sm">
          {isRaining && lastEpisode ? (
            <RainingDetails start={lastEpisode.start} mm={lastEpisode.mm} now={now} />
          ) : lastEpisode ? (
            <LastRainDetails episode={lastEpisode} now={now} />
          ) : (
            "Sin lluvia reciente."
          )}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Lluvia hoy</dt>
          <dd className="text-base font-semibold">{formatMm(todayMm)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Último dato</dt>
          <dd className="text-base font-semibold">
            <span className="whitespace-nowrap">{formatTime(observedAt)}</span>
            {isStale && (
              <span className="block text-xs font-medium text-amber-600 dark:text-amber-400">
                desactualizado
              </span>
            )}
          </dd>
        </div>
      </dl>

      <SourceLabel source={field.source} skipped={field.skipped} />
    </>
  );
}

function RainingDetails({ start, mm, now }: { start: string; mm: number; now: number | null }) {
  return (
    <>
      {now !== null && (
        <strong>Lleva {formatDuration(now - new Date(start).getTime())} · </strong>
      )}
      desde las {formatTime(start)} · {formatMm(mm)}
    </>
  );
}

function LastRainDetails({
  episode,
  now,
}: {
  episode: { start: string; end: string; mm: number };
  now: number | null;
}) {
  const day = now !== null ? `${formatDay(episode.start, now)} ` : "";
  return (
    <>
      Última lluvia: {day}de {formatTime(episode.start)} a {formatTime(episode.end)} (
      {formatMm(episode.mm)})
      {now !== null && <> · paró hace {formatDuration(now - new Date(episode.end).getTime())}</>}
    </>
  );
}
