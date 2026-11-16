import { CASE_STYLE, caseLook, LEGEND_GROUPS, LEGEND_NOTE } from "./cases";
import { Icon } from "./Icon";

/** Pastille miniature d'un type de case : lavis, timbre ou cachet. */
export function CaseSwatch({ type, size = 36 }: { type: keyof typeof CASE_STYLE; size?: number }) {
  const s = CASE_STYLE[type];
  const look = caseLook(type.length);
  const cls =
    s.kind === "lavis" ? `${s.bg} ${look.shape} border-[1.5px] border-encre/55` : s.kind === "timbre" ? "timbre rounded-[2px]" : "cachet";
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${cls}`}
      style={{ width: size, height: size, transform: `rotate(${look.rotate}deg)` }}
    >
      <Icon name={s.icon} size={size * 0.55} />
    </span>
  );
}

export function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {LEGEND_GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-2 font-display text-lg font-bold">{g.title}</p>
          <ul className={`grid gap-x-4 gap-y-2.5 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {g.types.map((t) => {
              const s = CASE_STYLE[t];
              return (
                <li key={t} className="flex items-center gap-3">
                  <CaseSwatch type={t} />
                  <span className="text-[15px] leading-tight">
                    <strong className="font-display text-base">{s.label}</strong>
                    <span className="block text-muted italic">{s.help}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-[13px] text-muted italic">{LEGEND_NOTE}</p>
    </div>
  );
}
