/** Guatemala's civil flag (no coat of arms), sized to the surrounding text. */
export function GuatemalaFlag({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 15"
      role="img"
      aria-label="Bandera de Guatemala"
      className={`inline-block h-[0.7em] w-auto rounded-[2px] ring-1 ring-line-strong ${className}`}
    >
      <rect width="8" height="15" fill="#4997d0" />
      <rect x="8" width="8" height="15" fill="#ffffff" />
      <rect x="16" width="8" height="15" fill="#4997d0" />
    </svg>
  );
}
