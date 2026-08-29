/** Barra de progresso simples (HP / SP / XP / HP do monstro). */
export function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-3 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
      <div
        className={`h-full transition-[width] duration-300 ${className ?? "bg-emerald-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
