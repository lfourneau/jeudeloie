import { CASE_STYLE, LEGEND_GROUPS, LEGEND_NOTE } from "./cases";

export function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {LEGEND_GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{g.title}</p>
          <ul className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {g.types.map((t) => {
              const s = CASE_STYLE[t];
              return (
                <li key={t} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${s.bg}`}>
                    {s.icon}
                  </span>
                  <span className="text-sm leading-tight">
                    <strong>{s.label}</strong>
                    <span className="block text-muted">{s.help}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-muted">{LEGEND_NOTE}</p>
    </div>
  );
}
