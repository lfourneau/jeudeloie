import { motion } from "framer-motion";
import boardJson from "@board";
import { type Board as BoardT, type CaseType, FINISH, MAX_TURNS } from "@rules";

export const board = boardJson as BoardT;

export const CASE_STYLE: Record<CaseType, { bg: string; icon: string; label: string }> = {
  depart: { bg: "bg-mint text-night", icon: "🏁", label: "Départ" },
  arrivee: { bg: "bg-gold text-night", icon: "💞", label: "Arrivée" },
  mot: { bg: "bg-sky/80", icon: "🔤", label: "Mot" },
  nombre: { bg: "bg-lilac/80", icon: "🔢", label: "Nombre" },
  emojis: { bg: "bg-rose/80", icon: "😍", label: "Emojis" },
  dessin: { bg: "bg-sky/50", icon: "🎨", label: "Dessin (joué en mot)" },
  photo: { bg: "bg-sky/50", icon: "📷", label: "Photo (jouée en mot)" },
  piege: { bg: "bg-white/10", icon: "🕳️", label: "Piège (bientôt)" },
  tremplin: { bg: "bg-white/10", icon: "🦘", label: "Tremplin (bientôt)" },
  coffre: { bg: "bg-white/10", icon: "🎁", label: "Coffre (bientôt)" },
  tempete: { bg: "bg-white/10", icon: "⛈️", label: "Tempête (bientôt)" },
  double: { bg: "bg-white/10", icon: "⏩", label: "Double tour (bientôt)" },
};

const COLS = 7;

/** Plateau en serpentin : rangée paire de gauche à droite, rangée impaire de droite à gauche. */
export function Board({ position }: { position: number }) {
  const rows: number[][] = [];
  for (let start = 0; start <= FINISH; start += COLS) {
    const row = [];
    for (let i = start; i < Math.min(start + COLS, FINISH + 1); i++) row.push(i);
    rows.push(rows.length % 2 === 0 ? row : row.reverse());
  }
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row, r) => (
        <div key={r} className={`flex gap-1.5 ${r % 2 === 1 ? "justify-end" : ""}`}>
          {row.map((i) => {
            const c = board.cases[i];
            const s = CASE_STYLE[c.type];
            return (
              <div
                key={i}
                title={`${i} · ${s.label}`}
                className={`relative flex aspect-square flex-1 basis-0 items-center justify-center rounded-lg text-sm ${s.bg} ${
                  i < position ? "opacity-50" : ""
                }`}
                style={{ maxWidth: `calc((100% - ${(COLS - 1) * 6}px) / ${COLS})` }}
              >
                <span className="select-none">{s.icon}</span>
                <span className="absolute bottom-0 right-1 text-[9px] font-bold opacity-70">{i}</span>
                {i === position && (
                  <motion.div
                    layoutId="pawn"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="absolute inset-0 flex items-center justify-center rounded-lg ring-4 ring-gold"
                  >
                    <span className="text-2xl drop-shadow">🧸</span>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Bandeau compact en haut des écrans de jeu : progression, tour X/15, partenaire connecté. */
export function MiniBoard({
  position,
  turn,
  partnerName,
  partnerOnline,
}: {
  position: number;
  turn: number;
  partnerName: string;
  partnerOnline: boolean;
}) {
  return (
    <div className="rounded-2xl bg-plum/70 px-4 py-3 ring-1 ring-white/5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-display font-semibold">
          Tour {Math.min(turn, MAX_TURNS)}/{MAX_TURNS}
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className={`h-2 w-2 rounded-full ${partnerOnline ? "bg-mint" : "bg-white/20"}`} />
          {partnerName}
        </span>
        <span className="font-display font-semibold">
          Case {position}/{FINISH}
        </span>
      </div>
      <div className="flex h-3 gap-[2px]">
        {board.cases.map((c) => (
          <div
            key={c.index}
            className={`relative flex-1 rounded-sm ${CASE_STYLE[c.type].bg} ${c.index > position ? "opacity-40" : ""}`}
          >
            {c.index === position && (
              <motion.div layoutId="mini-pawn" className="absolute -top-1.5 left-1/2 h-6 w-1.5 -translate-x-1/2 rounded-full bg-gold" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
