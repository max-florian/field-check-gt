import { formatMm } from "@/lib/format";
import type { Playability } from "@/lib/weather/rain";

const STYLES: Record<Playability, { label: string; icon: string; className: string }> = {
  playable: {
    label: "Jugable",
    icon: "✅",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  doubtful: {
    label: "Dudoso",
    icon: "⚠️",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200",
  },
  unplayable: {
    label: "No jugable",
    icon: "⛔",
    className: "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200",
  },
};

type Props = { playability: Playability; isRaining: boolean; recentMm: number };

export function PlayabilityBadge({ playability, isRaining, recentMm }: Props) {
  const { label, icon, className } = STYLES[playability];
  const reason = isRaining
    ? "Está lloviendo en este momento."
    : recentMm > 0
      ? `Llovieron ${formatMm(recentMm)} en las últimas 3 horas${playability === "playable" ? "." : "; el campo puede estar mojado."}`
      : "Sin lluvia en las últimas 3 horas.";

  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${className}`}>
      <span aria-hidden="true" className="text-xl leading-7">
        {icon}
      </span>
      <div>
        <p className="text-lg font-bold leading-7">{label}</p>
        <p className="text-sm opacity-90">{reason}</p>
      </div>
    </div>
  );
}
