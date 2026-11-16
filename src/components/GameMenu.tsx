import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Dots } from "./ui";

type Pending = "quit" | "reset" | null;

/**
 * Petit menu de partie : quitter (tout le monde) et recommencer (hôte seulement).
 * Chaque action demande une confirmation, car elle touche aussi le partenaire.
 */
export function GameMenu({ onQuit, onReset }: { onQuit: () => Promise<void>; onReset?: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(null);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const run = async () => {
    const fn = confirm === "quit" ? onQuit : onReset;
    if (!fn) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      setOpen(false);
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const item = "flex min-h-11 w-full items-center gap-2.5 px-3 text-left font-display text-[17px] font-bold hover:bg-papier";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setConfirm(null);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu de la partie"
        className="pilule flex min-h-11 min-w-11 items-center justify-center gap-1.5 border-[1.5px] border-encre/60 bg-lettre px-3 font-display font-bold"
      >
        <Icon name="menu" size={20} /> <span className="hidden sm:inline">Partie</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: -0.8 }}
            exit={{ opacity: 0, y: -6 }}
            className="feuille absolute right-0 z-40 mt-2 w-64 py-2"
          >
            {confirm ? (
              <div className="flex flex-col gap-2 px-3 py-1">
                <p className="text-[15px] leading-snug">
                  {confirm === "quit"
                    ? "Tu quittes la partie. Ton partenaire revient en salle d'attente."
                    : "La partie repart de zéro, pour vous deux, en salle d'attente."}
                </p>
                {error && <p className="text-[14px] text-cachet italic">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={run}
                    disabled={busy}
                    className="pilule min-h-11 flex-1 bg-encre px-3 font-display font-bold text-lettre disabled:opacity-50"
                  >
                    {busy ? <Dots /> : confirm === "quit" ? "Quitter" : "Recommencer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="pilule min-h-11 flex-1 border-[1.5px] border-encre/60 px-3 font-display font-bold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                {onReset && (
                  <button type="button" role="menuitem" className={item} onClick={() => setConfirm("reset")}>
                    <Icon name="recommencer" size={20} /> Recommencer la partie
                  </button>
                )}
                <button type="button" role="menuitem" className={`${item} text-cachet`} onClick={() => setConfirm("quit")}>
                  <Icon name="sortie" size={20} /> Quitter la partie
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
