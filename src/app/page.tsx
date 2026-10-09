import { LOCATIONS } from "@/config/locations";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">¿Está lloviendo en el campo?</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {LOCATIONS.map((location) => (
          <li key={location.slug} className="rounded-xl border border-black/10 p-4 dark:border-white/15">
            <h2 className="text-lg font-medium">{location.name}</h2>
            <p className="text-sm opacity-70">{location.area}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
