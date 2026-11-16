import { FINISH, MAX_TURNS } from "@rules";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { Legend } from "./Legend";
import { SquareBoard } from "./SquareBoard";
import { Card } from "./ui";

/** Plateau + infos de partie + légende : colonne de gauche sur ordinateur, feuille plein écran sur téléphone. */
export function BoardPanel({
  position,
  pawn,
  turn,
  startName,
  endName,
}: {
  position: number;
  pawn: string;
  turn?: number;
  startName?: string;
  endName?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="!px-3 !pt-3 !pb-4 sm:!px-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 px-1">
          <p className="titre text-2xl text-cachet">
            {startName && endName ? `De chez ${startName} à chez ${endName}` : "Le chemin"}
          </p>
          <p className="font-display text-lg font-bold">
            {turn ? `Tour ${Math.min(turn, MAX_TURNS)}/${MAX_TURNS} · ` : ""}case {position}/{FINISH}
          </p>
        </div>
        <div className="mx-auto" style={{ maxWidth: "min(100%, calc(100dvh - 8.5rem))" }}>
          <SquareBoard position={position} pawn={pawn} startName={startName} endName={endName} />
        </div>
      </Card>
      <Card tilt={0.4}>
        <p className="titre mb-3 text-[28px]">Légende</p>
        <Legend />
      </Card>
    </div>
  );
}

/** Mise en page : une colonne sur téléphone, deux sur ordinateur (plateau à gauche, jeu à droite). */
export function GameLayout({ board, children }: { board: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start lg:gap-10 lg:pt-8">
      <aside className="hidden lg:block">{board}</aside>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 lg:max-w-none">{children}</main>
    </div>
  );
}

/** Plateau et légende en plein écran, pour téléphone. */
export function BoardSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-papier px-4 pt-4 pb-10 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Plateau et légende"
        >
          <div className="mx-auto flex max-w-md flex-col gap-4">
            <button
              onClick={onClose}
              className="pilule flex min-h-11 items-center gap-1.5 self-end border-[1.5px] border-encre/60 bg-lettre px-4 font-display font-bold"
            >
              <Icon name="fermer" size={18} /> Fermer
            </button>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
