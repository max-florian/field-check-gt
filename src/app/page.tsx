import { FieldDashboard } from "@/components/field-dashboard";
import { GuatemalaFlag } from "@/components/guatemala-flag";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAllFieldStatuses } from "@/lib/weather/cached";

export default async function Home() {
  const initial = await getAllFieldStatuses();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            Field Check GT <GuatemalaFlag />
          </h1>
          <p className="mt-1 text-muted">
            Campos de softbol de Ciudad de Guatemala
          </p>
        </div>
        <ThemeToggle />
      </header>

      <FieldDashboard initial={initial} />

      <footer className="mt-auto flex flex-col gap-2 text-xs leading-relaxed text-muted">
        <p>
          Se considera lluvia a partir de 0.5 mm en 15 minutos; la llovizna no cuenta. Un aguacero
          termina después de 15 minutos sin lluvia. Los datos se actualizan cada 5 minutos.
        </p>
        <p>
          El estado de juego es una estimación según la lluvia de las últimas 3 horas: no jugable
          si llueve o cayeron 10 mm o más, dudoso desde 3 mm. Confirma siempre con la organización
          del campo.
        </p>
      </footer>
    </main>
  );
}
