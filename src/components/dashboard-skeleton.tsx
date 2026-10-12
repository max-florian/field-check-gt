import { LOCATIONS } from "@/config/locations";

/** Shown while the current status loads, with the real field names already in place. */
export function DashboardSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Cargando el estado de los campos"
    >
      <div className="flex h-8 items-center text-sm text-muted">Consultando las estaciones…</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {LOCATIONS.map((location) => (
          <article
            key={location.slug}
            className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm"
          >
            <header>
              <h2 className="text-lg font-semibold">{location.name}</h2>
              <p className="text-sm text-muted">{location.area}</p>
            </header>
            <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-36 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-10 animate-pulse rounded-xl bg-surface-muted" />
          </article>
        ))}
      </div>
    </div>
  );
}
