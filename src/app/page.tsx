import { FieldDashboard } from "@/components/field-dashboard";
import { getAllFieldStatuses } from "@/lib/weather/cached";

export default async function Home() {
  const initial = await getAllFieldStatuses();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">¿Está lloviendo en el campo?</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Campos de softbol de Ciudad de Guatemala
        </p>
      </header>

      <FieldDashboard initial={initial} />

      <footer className="mt-auto text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Se considera lluvia a partir de 0.5 mm en 15 minutos; la llovizna no cuenta. Un aguacero
        termina después de 15 minutos sin lluvia. Los datos se actualizan cada 5 minutos.
      </footer>
    </main>
  );
}
