import { JOKERS, type Joker } from "@rules";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Round } from "../lib/types";
import { Icon, type IconName } from "./Icon";
import { StampIn } from "./Juice";

/** Tampon d'oblitération postale : cercle daté et ondes, à l'encre rouge. */
function Cancel() {
  return (
    <svg viewBox="0 0 80 50" className="h-full w-full text-cachet" fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="26" cy="25" r="17" strokeWidth={2} />
      <circle cx="26" cy="25" r="12.5" strokeWidth={1} opacity={0.6} />
      <path d="M19 25h14" strokeWidth={1.6} />
      <path d="M44 15c4-3 8 3 12 0s8 3 12 0M44 25c4-3 8 3 12 0s8 3 12 0M44 35c4-3 8 3 12 0s8 3 12 0" strokeWidth={1.8} />
    </svg>
  );
}

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
  // Jokers utilisés pendant que l'écran est ouvert : le tampon tombe avec son et rebond.
  const before = useRef(inventory);
  const [justUsed, setJustUsed] = useState<string[]>([]);
  useEffect(() => {
    const gone = before.current.filter((j) => !inventory.includes(j));
    before.current = inventory;
    if (gone.length) setJustUsed((u) => [...u, ...gone]);
  }, [inventory]);

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
              {!left && <span className="text-[12px] italic text-encre/70">déjà utilisé</span>}
            </>
          );
          const cls = `timbre relative flex min-h-24 w-full flex-col items-center justify-center gap-1 px-1.5 py-2 text-center transition ${
            left ? "" : "text-encre/45"
          }`;
          const cancel = !left && (
            <span aria-hidden className="pointer-events-none absolute -top-2 -right-2 h-9 w-14">
              {justUsed.includes(j) ? (
                <StampIn rotate={-12} className="h-full w-full">
                  <span className="block h-full w-full">
                    <Cancel />
                  </span>
                </StampIn>
              ) : (
                <span className="block h-full w-full rotate-[-12deg] opacity-85">
                  <Cancel />
                </span>
              )}
            </span>
          );
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
                  {cancel}
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
  const reduce = useReducedMotion();
  if (!round.joker_keyword && !round.joker_topic) return null;
  const stick = (rotate: number) =>
    reduce
      ? {}
      : {
          initial: { scale: 0.5, rotate: rotate - 14, y: -18, opacity: 0 },
          animate: { scale: 1, rotate, y: 0, opacity: 1 },
          transition: { type: "spring" as const, stiffness: 420, damping: 16 },
        };
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {round.joker_topic && (
        <motion.p
          {...stick(-1.5)}
          className="flex rotate-[-1.5deg] items-center gap-2 border-[1.5px] border-dashed border-cachet bg-lettre px-3 py-1.5 text-cachet"
        >
          <Icon name="etiquette" size={20} />
          <span className="font-display text-sm">Thème :</span>
          <strong className="font-display text-lg">{round.joker_topic}</strong>
        </motion.p>
      )}
      {round.joker_keyword && (
        <motion.p
          {...stick(1.2)}
          className="flex rotate-[1.2deg] items-center gap-2 border-[1.5px] border-dashed border-cachet bg-lettre px-3 py-1.5 text-cachet"
        >
          <Icon name="cle" size={20} />
          <span className="font-display text-sm">Mot-clé :</span>
          <strong className="font-display text-lg">{round.joker_keyword}</strong>
        </motion.p>
      )}
    </div>
  );
}
