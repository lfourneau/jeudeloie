import { JOKERS, type Joker } from "@rules";
import type { Round } from "../lib/types";
import { Icon, type IconName } from "./Icon";

export const JOKER_INFO: Record<Joker, { label: string; icon: IconName; help: string }> = {
  mot_cle: { label: "Mot-clé", icon: "cle", help: "Un mot qui met sur la piste" },
  theme: { label: "Thème", icon: "etiquette", help: "Le sujet de la question" },
  choix: { label: "Trois propositions", icon: "cartes", help: "Choisir parmi trois questions" },
};

/** Jokers utilisés pendant ce tour (lisible par les deux joueurs). */
export function usedJokers(round: Round): Joker[] {
  return JOKERS.filter((j) =>
    j === "mot_cle" ? !!round.joker_keyword : j === "theme" ? !!round.joker_topic : !!round.joker_choices,
  );
}

/**
 * Rangée des trois jokers communs, en timbres. Un joker utilisé reste visible mais oblitéré.
 * `onUse` absent : simple affichage (côté répondant).
 */
export function JokerBar({
  inventory,
  onUse,
  busy,
}: {
  inventory: readonly string[];
  onUse?: (j: Joker) => void;
  busy?: Joker | null;
}) {
  return (
    <div>
      <p className="mb-2 font-display text-[15px] text-muted">
        Vos jokers pour la partie · {inventory.length}/{JOKERS.length}
      </p>
      <ul className="grid grid-cols-3 gap-2.5">
        {JOKERS.map((j, k) => {
          const info = JOKER_INFO[j];
          const left = inventory.includes(j);
          const tilt = [-2, 1.5, -1][k];
          const content = (
            <>
              <Icon name={info.icon} size={30} />
              <span className="font-display text-[15px] leading-tight font-bold">{info.label}</span>
              {!left && <span className="text-[12px] italic">déjà utilisé</span>}
            </>
          );
          const cls = `timbre flex min-h-24 w-full flex-col items-center justify-center gap-1 px-1.5 py-2 text-center transition ${
            left ? "" : "opacity-45 line-through decoration-cachet/60"
          }`;
          return (
            <li key={j} style={{ transform: `rotate(${tilt}deg)` }}>
              {onUse && left ? (
                <button
                  type="button"
                  onClick={() => onUse(j)}
                  disabled={!!busy}
                  title={info.help}
                  className={`${cls} hover:-translate-y-0.5 disabled:opacity-60`}
                >
                  {busy === j ? <span className="font-display">…</span> : content}
                  <span className="sr-only">{info.help}</span>
                </button>
              ) : (
                <div className={cls} aria-label={`${info.label}${left ? "" : " (déjà utilisé)"}`}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Indices révélés par les jokers « mot-clé » et « thème ». */
export function JokerHints({ round }: { round: Round }) {
  if (!round.joker_keyword && !round.joker_topic) return null;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {round.joker_topic && (
        <p className="flex rotate-[-1.5deg] items-center gap-2 border-[1.5px] border-dashed border-cachet bg-lettre px-3 py-1.5 text-cachet">
          <Icon name="etiquette" size={20} />
          <span className="font-display text-sm">Thème :</span>
          <strong className="font-display text-lg">{round.joker_topic}</strong>
        </p>
      )}
      {round.joker_keyword && (
        <p className="flex rotate-[1.2deg] items-center gap-2 border-[1.5px] border-dashed border-cachet bg-lettre px-3 py-1.5 text-cachet">
          <Icon name="cle" size={20} />
          <span className="font-display text-sm">Mot-clé :</span>
          <strong className="font-display text-lg">{round.joker_keyword}</strong>
        </p>
      )}
    </div>
  );
}
