import boardJson from "@board";
import { type Board, FINISH } from "@rules";
import { motion, useReducedMotion } from "framer-motion";
import { CASE_STYLE, caseLook } from "./cases";
import { Icon } from "./Icon";
import { Pawn } from "./Pawn";

export const board = boardJson as Board;

// ---------- Géométrie : spirale carrée 8 × 8, départ dans le coin, arrivée au centre ----------

export const SIDE = 8;

/** Coordonnées (colonne, ligne) de chaque case, en tournant dans le sens horaire vers le centre. */
export function spiralOrder(n: number): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  let top = 0;
  let left = 0;
  let bottom = n - 1;
  let right = n - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push({ col: c, row: top });
    top++;
    for (let r = top; r <= bottom; r++) out.push({ col: right, row: r });
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push({ col: c, row: bottom });
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push({ col: left, row: r });
      left++;
    }
  }
  return out;
}

const CELLS = spiralOrder(SIDE); // CELLS[i] = place de la case i (64 cases : 0 à 63)
const SLOT = 100 / SIDE; // taille d'un emplacement, en %

/** Chemin en pointillés d'encre, avec de petites courbes entre les cases. */
const ROAD = CELLS.slice(0, FINISH + 1)
  .map((p, i, all) => {
    const x = p.col + 0.5;
    const y = p.row + 0.5;
    if (i === 0) return `M${x},${y}`;
    const prev = all[i - 1];
    const px = prev.col + 0.5;
    const py = prev.row + 0.5;
    // point de contrôle décalé perpendiculairement, alterné d'une case à l'autre
    const bend = i % 2 ? 0.16 : -0.16;
    const cx = (px + x) / 2 + (py === y ? 0 : bend);
    const cy = (py + y) / 2 + (px === x ? 0 : bend);
    return `Q${cx},${cy} ${x},${y}`;
  })
  .join(" ");

// ---------- Plateau ----------

export function SquareBoard({
  position,
  pawn,
  startName,
  endName,
  className = "",
}: {
  position: number;
  pawn: string;
  startName?: string;
  endName?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const at = CELLS[Math.max(0, Math.min(FINISH, position))];
  return (
    <div
      className={`@container relative aspect-square w-full select-none ${className}`}
      role="img"
      aria-label={`Plateau de ${FINISH} cases. Le pion est case ${position}.`}
    >
      <svg viewBox={`0 0 ${SIDE} ${SIDE}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d={ROAD}
          fill="none"
          stroke="#1F2F4A"
          strokeOpacity={0.55}
          strokeWidth={0.03}
          strokeDasharray="0.03 0.13"
          strokeLinecap="round"
        />
      </svg>

      {board.cases.map((c) => {
        const p = CELLS[c.index];
        const s = CASE_STYLE[c.type];
        const look = caseLook(c.index);
        const passed = c.index < position;
        const name = c.type === "depart" ? startName : c.type === "arrivee" ? endName : undefined;
        const base = "absolute flex flex-col overflow-hidden";
        const box = {
          left: `${p.col * SLOT + SLOT * 0.08}%`,
          top: `${p.row * SLOT + SLOT * 0.08 + (look.shift * SLOT) / 100}%`,
          width: `${SLOT * 0.84}%`,
          height: `${SLOT * 0.84}%`,
          transform: `rotate(${look.rotate}deg)`,
          opacity: passed ? 0.5 : 1,
        };
        const title = `${c.index} · ${s.label}${name ? ` · chez ${name}` : ""}`;

        if (s.kind === "cachet") {
          return (
            <div key={c.index} title={title} style={box} className={`${base} cachet items-center justify-center text-center`}>
              <Icon name={s.icon} size="3.4cqw" strokeWidth={2} />
              <span className="mt-[0.2cqw] max-w-[92%] truncate font-display text-[1.7cqw] leading-none font-bold">
                {name ? `chez ${name}` : s.label}
              </span>
            </div>
          );
        }
        if (s.kind === "timbre") {
          return (
            <div key={c.index} title={title} style={{ ...box, borderRadius: "2px" }} className={`${base} timbre p-[0.5cqw]`}>
              <span className="font-display text-[2.4cqw] leading-none font-bold">{c.index}</span>
              <span className="flex flex-1 items-center justify-center">
                <Icon name={s.icon} size="4cqw" strokeWidth={1.8} />
              </span>
              <span className="hidden text-center font-display text-[1.45cqw] leading-none font-bold @min-[520px]:block">
                {s.label}
              </span>
            </div>
          );
        }
        return (
          <div
            key={c.index}
            title={title}
            style={box}
            className={`${base} ${s.bg} ${look.shape} border-[1.5px] border-encre/55 px-[1.1cqw] py-[0.7cqw]`}
          >
            <span className="font-display text-[2.6cqw] leading-none font-bold">{c.index}</span>
            <span className="flex flex-1 items-center justify-center">
              <Icon name={s.icon} size="3.6cqw" strokeWidth={1.7} />
            </span>
            <span className="hidden truncate text-center text-[1.3cqw] leading-none font-semibold @min-[520px]:block">
              {s.label.replace(/^(Un|Une|Des) /, "")}
            </span>
          </div>
        );
      })}

      {/* Pion, en haut à droite de sa case */}
      <motion.div
        className="pointer-events-none absolute z-10 drop-shadow-[0_2px_2px_rgba(31,47,74,.35)]"
        style={{ width: `${SLOT * 0.5}%`, height: `${SLOT * 0.5}%` }}
        initial={false}
        animate={{ left: `${at.col * SLOT + SLOT * 0.52}%`, top: `${at.row * SLOT - SLOT * 0.04}%` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 22 }}
      >
        <Pawn id={pawn} size="100%" />
      </motion.div>
    </div>
  );
}
