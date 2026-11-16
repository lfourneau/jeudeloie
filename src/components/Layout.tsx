import { FINISH, MAX_TURNS } from "@rules";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Legend } from "./Legend";
import { SpiralBoard } from "./SpiralBoard";
import { Card } from "./ui";

/** Plateau + infos de partie + légende : colonne de gauche sur ordinateur, feuille plein écran sur téléphone. */
export function BoardPanel({ position, pawn, turn }: { position: number; pawn: string; turn?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="!p-4">
        <div className="mb-2 flex items-center justify-between font-display font-semibold">
          <span>{turn ? `Tour ${Math.min(turn, MAX_TURNS)}/${MAX_TURNS}` : "Le plateau"}</span>
          <span>
            {pawn} case {position}/{FINISH}
          </span>
        </div>
        <div className="mx-auto" style={{ maxWidth: "min(100%, calc(100vh - 7rem))" }}>
          <SpiralBoard position={position} pawn={pawn} />
        </div>
      </Card>
      <Card>
        <p className="mb-3 font-display text-lg font-semibold">Légende</p>
        <Legend />
      </Card>
    </div>
  );
}

/** Mise en page : une colonne sur téléphone, deux sur ordinateur (plateau à gauche, jeu à droite). */
export function GameLayout({ board, children }: { board: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start lg:gap-8 lg:pt-8">
      <aside className="hidden lg:block">{board}</aside>
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 lg:max-w-none">{children}</main>
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
          className="fixed inset-0 z-50 overflow-y-auto bg-night/95 px-4 pt-4 pb-10 backdrop-blur lg:hidden"
        >
          <div className="mx-auto flex max-w-md flex-col gap-4">
            <button onClick={onClose} className="self-end rounded-full bg-plum-light px-4 py-2 font-bold">
              ✕ Fermer
            </button>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
