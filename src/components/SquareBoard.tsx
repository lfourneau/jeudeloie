import boardJson from "@board";
import { type Board, FINISH } from "@rules";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CASE_STYLE, caseLook, TIMBRE_NOTE } from "./cases";
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

// ---------- Infobulle (ordinateur uniquement) ----------

/** Vrai seulement avec une souris : sur écran tactile, un appui ne doit pas ouvrir d'infobulle. */
function useFinePointer(): boolean {
  const query = "(hover: hover) and (pointer: fine)";
  const [fine, setFine] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setFine(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return fine;
}

function CaseTooltip({ index, startName, endName }: { index: number; startName?: string; endName?: string }) {
  const c = board.cases[index];
  const s = CASE_STYLE[c.type];
  const p = CELLS[index];
  const name = c.type === "depart" ? startName : c.type === "arrivee" ? endName : undefined;
  // Au-dessus de la case, sauf sur la première ligne ; calée à gauche ou à droite près des bords.
  const below = p.row === 0;
  const x = p.col === 0 ? "0%" : p.col === SIDE - 1 ? "-100%" : "-50%";
  const left = p.col === 0 ? p.col * SLOT : p.col === SIDE - 1 ? (p.col + 1) * SLOT : (p.col + 0.5) * SLOT;
  return (
    <motion.div
      key={index}
      role="tooltip"
      initial={{ opacity: 0, y: below ? -4 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none absolute z-20 w-56"
      style={{
        left: `${left}%`,
        top: below ? `${(p.row + 1) * SLOT}%` : `${p.row * SLOT}%`,
        translate: `${x} ${below ? "4px" : "calc(-100% - 4px)"}`,
      }}
    >
      <div className="feuille rotate-[-1deg] px-3.5 py-2.5 text-left">
        <p className="font-display text-[17px] leading-tight font-bold">
          {index} · {s.label}
          {name ? ` · chez ${name}` : ""}
        </p>
        <p className="mt-0.5 text-[14px] leading-snug">{s.help}</p>
        {s.kind === "timbre" && <p className="mt-1 text-[13px] leading-snug text-muted italic">{TIMBRE_NOTE}</p>}
      </div>
    </motion.div>
  );
}

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
  const fine = useFinePointer();
  const [hover, setHover] = useState<number | null>(null);
  const at = CELLS[Math.max(0, Math.min(FINISH, position))];
  return (
    <div
      className={`@container relative aspect-square w-full select-none ${className}`}
      role="img"
      aria-label={`Plateau de ${FINISH} cases. Le pion est case ${position}.`}
      onMouseLeave={() => setHover(null)}
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
        const hoverProps = fine ? { onMouseEnter: () => setHover(c.index) } : {};

        if (s.kind === "cachet") {
          return (
            <div key={c.index} {...hoverProps} style={box} className={`${base} cachet items-center justify-center text-center`}>
              <Icon name={s.icon} size="3.4cqw" strokeWidth={2} />
              <span className="mt-[0.2cqw] max-w-[92%] truncate font-display text-[1.7cqw] leading-none font-bold">
                {name ? `chez ${name}` : s.label}
              </span>
            </div>
          );
        }
        if (s.kind === "timbre") {
          return (
            <div key={c.index} {...hoverProps} style={{ ...box, borderRadius: "2px" }} className={`${base} timbre p-[0.5cqw]`}>
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
            {...hoverProps}
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

      <AnimatePresence>
        {fine && hover !== null && <CaseTooltip index={hover} startName={startName} endName={endName} />}
      </AnimatePresence>

      {/* Pion, en haut à droite de sa case */}
      <motion.div
        className="pointer-events-none absolute z-10 drop-shadow-[0_2px_2px_rgba(31,47,74,.35)]"
        style={{ width: `${SLOT * 0.5}%`, height: `${SLOT * 0.5}%` }}
        initial={false}
        animate={{ left: `${at.col * SLOT + SLOT * 0.52}%`, top: `${at.row * SLOT - SLOT * 0.04}%` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 22 }}
      >
        {/* petit saut à chaque case */}
        <motion.div
          key={position}
          className="h-full w-full"
          initial={false}
          animate={reduce ? undefined : { y: ["0%", "-38%", "0%"], scaleY: [1, 1.06, 0.9, 1] }}
          transition={{ duration: 0.26, ease: "easeOut" }}
        >
          <Pawn id={pawn} size="100%" />
        </motion.div>
      </motion.div>
    </div>
  );
}
