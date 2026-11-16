import { FINISH, MAX_TURNS } from "@rules";
import { motion } from "framer-motion";
import { CASE_STYLE, caseLook } from "./cases";
import { Pawn } from "./Pawn";
import { board } from "./SquareBoard";

const AROUND = 4; // cases montrées de part et d'autre du pion

/** Bandeau compact des écrans de jeu (téléphone) : cases autour du pion, tour X/24, partenaire. */
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
  const start = Math.max(0, Math.min(FINISH - AROUND * 2, position - AROUND));
  const visible = board.cases.slice(start, start + AROUND * 2 + 1);
  const left = FINISH - position;
  return (
    <div className="feuille px-4 pt-3 pb-2">
      <div className="mb-2 flex items-center justify-between gap-2 text-[15px]">
        <span className="font-display font-bold">
          Tour {Math.min(turn, MAX_TURNS)}/{MAX_TURNS}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 truncate text-muted">
          <span className={`h-2 w-2 shrink-0 rounded-full ${partnerOnline ? "bg-sauge ring-1 ring-encre/50" : "bg-encre/20"}`} />
          {partnerName}
        </span>
        <span className="font-display font-bold">
          Case {position}/{FINISH}
        </span>
      </div>
      <div className="mt-6 flex items-end gap-1">
        {visible.map((c) => {
          const s = CASE_STYLE[c.type];
          const look = caseLook(c.index);
          const cls = s.kind === "lavis" ? `${s.bg} ${look.shape} border border-encre/55` : s.kind === "timbre" ? "timbre" : "cachet";
          return (
            <div key={c.index} className="relative flex-1">
              {c.index === position && (
                <motion.div layoutId="mini-pawn" className="absolute -top-6 left-1/2 z-10 -translate-x-1/2">
                  <Pawn id={pawn} size={26} />
                </motion.div>
              )}
              <div
                className={`flex aspect-square items-center justify-center font-display text-[13px] font-bold ${cls} ${c.index < position ? "opacity-50" : ""}`}
                style={{ transform: `rotate(${look.rotate}deg)` }}
              >
                {c.index}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-center text-[13px] text-muted italic">
        {left > 0 ? `Encore ${left} case${left > 1 ? "s" : ""} avant de vous retrouver` : "Vous êtes arrivés !"}
      </p>
      {onOpenBoard && (
        <button onClick={onOpenBoard} className="min-h-11 w-full text-center font-display text-[15px] font-bold text-encre-claire underline decoration-encre/30 underline-offset-4 lg:hidden">
          Voir le plateau et la légende
        </button>
      )}
    </div>
  );
}
