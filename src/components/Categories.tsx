import { CATEGORIES, type Category, SPICY2_FROM } from "@rules";
import { motion } from "framer-motion";
import { useState } from "react";
import { actions } from "../lib/actions";
import { sfx } from "../lib/juice";
import { CATEGORY_STYLE } from "./cases";
import { Icon } from "./Icon";
import { ErrorText } from "./ui";

/**
 * Réglages de partie, en salle d'attente : l'hôte coche les catégories de questions.
 * Une catégorie décochée voit ses cases piocher dans une catégorie active au hasard.
 * Le partenaire voit le choix en lecture seule.
 */
export function CategoryPicker({
  roomId,
  active,
  isHost,
  hostName,
}: {
  roomId: string;
  active: readonly Category[];
  isHost: boolean;
  hostName?: string;
}) {
  const [busy, setBusy] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (c: Category) => {
    const next = active.includes(c) ? active.filter((x) => x !== c) : [...active, c];
    if (next.length === 0) {
      setError("Garde au moins une catégorie.");
      return;
    }
    sfx.tick();
    setBusy(c);
    setError(null);
    try {
      await actions.setCategories(roomId, CATEGORIES.filter((x) => next.includes(x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted italic">
        {isHost
          ? "Décoche les catégories dont vous ne voulez pas : leurs cases piocheront dans une autre, au hasard."
          : `Choisies par ${hostName ?? "l'hôte"}.`}
      </p>
      <ul className="grid grid-cols-1 gap-2.5">
        {CATEGORIES.map((c, i) => {
          const s = CATEGORY_STYLE[c];
          const on = active.includes(c);
          const tilt = [-1, 0.8, -0.6, 1.1][i];
          const body = (
            <>
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center border-[1.5px] border-encre/55 forme-${i + 1} ${s.bg} ${on ? "" : "grayscale"}`}
              >
                <Icon name={s.icon} size={24} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-display text-lg leading-tight font-bold">{s.label}</span>
                <span className="block text-[13px] leading-snug text-muted italic">
                  {s.help}
                  {c === "spicy" ? ` · plus osé à partir de la case ${SPICY2_FROM}` : ""}
                </span>
              </span>
              <span
                aria-hidden
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px_8px_5px_7px] border-[1.5px] ${
                  on ? "border-encre bg-encre text-lettre" : "border-encre/40 bg-lettre"
                }`}
              >
                {on && (
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                    <path d="M5 12.6c1.8 1.6 3.2 3.2 4.4 5 2.6-4.6 5.6-8.4 9.6-11.6" />
                  </svg>
                )}
              </span>
            </>
          );
          const cls = `feuille flex w-full items-center gap-3 px-3 py-2.5 transition ${on ? "" : "opacity-60"}`;
          return (
            <motion.li key={c} style={{ rotate: tilt }} whileTap={isHost ? { scale: 0.97 } : undefined}>
              {isHost ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={busy !== null}
                  onClick={() => toggle(c)}
                  className={`${cls} hover:-translate-y-0.5 disabled:cursor-wait`}
                >
                  {body}
                </button>
              ) : (
                <div className={cls} aria-label={`${s.label} : ${on ? "activée" : "désactivée"}`}>
                  {body}
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
