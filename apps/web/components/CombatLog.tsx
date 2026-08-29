export interface LogEntry {
  id: number;
  text: string;
}

export function CombatLog({ entries }: { entries: LogEntry[] }) {
  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-2 font-semibold">Log de combate</h2>
      <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
        {entries.length === 0 ? (
          <li className="text-neutral-400">Aguardando o primeiro golpe…</li>
        ) : (
          entries.map((entry, i) => (
            <li
              key={entry.id}
              className={
                i === 0
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500"
              }
            >
              {entry.text}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
