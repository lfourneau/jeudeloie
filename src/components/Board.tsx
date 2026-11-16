import { FINISH, MAX_TURNS } from "@rules";
import { motion } from "framer-motion";
import { CASE_STYLE } from "./cases";
import { board } from "./SpiralBoard";

/** Bandeau compact en haut des écrans de jeu (téléphone) : progression, tour X/15, partenaire. */
export function MiniBoard({
  position,
  turn,
  pawn,
  partnerName,
  partnerOnline,
  onOpenBoard,
}: {
  position: number;
  turn: number;
  pawn: string;
  partnerName: string;
  partnerOnline: boolean;
  onOpenBoard?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-plum/70 px-4 py-3 ring-1 ring-white/5">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-display font-semibold">
          Tour {Math.min(turn, MAX_TURNS)}/{MAX_TURNS}
        </span>
        <span className="flex items-center gap-1.5 truncate text-muted">
          <span className={`h-2 w-2 shrink-0 rounded-full ${partnerOnline ? "bg-mint" : "bg-white/20"}`} />
          {partnerName}
        </span>
        <span className="font-display font-semibold">
          {pawn} {position}/{FINISH}
        </span>
      </div>
      <div className="flex h-3 gap-[2px]">
        {board.cases.map((c) => (
          <div key={c.index} className={`relative flex-1 rounded-sm ${CASE_STYLE[c.type].bg} ${c.index > position ? "opacity-40" : ""}`}>
            {c.index === position && (
              <motion.div layoutId="mini-pawn" className="absolute -top-1.5 left-1/2 h-6 w-1.5 -translate-x-1/2 rounded-full bg-gold" />
            )}
          </div>
        ))}
      </div>
      {onOpenBoard && (
        <button onClick={onOpenBoard} className="mt-2 w-full text-center text-xs font-bold text-muted underline-offset-4 hover:underline lg:hidden">
          Voir le plateau et la légende
        </button>
      )}
    </div>
  );
}
