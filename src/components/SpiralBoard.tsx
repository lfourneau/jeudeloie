import boardJson from "@board";
import { type Board, FINISH } from "@rules";
import { motion } from "framer-motion";
import { CASE_STYLE } from "./cases";

export const board = boardJson as Board;

// ---------- Géométrie : spirale d'Archimède, Départ à l'extérieur, Arrivée au centre ----------

const STEP = 1; // distance entre deux cases le long du chemin
const CELL_R = 0.42; // rayon d'une case
const CENTER_R = 0.75; // rayon de la case Arrivée
const B = (STEP * 1.18) / (2 * Math.PI); // r = B·θ : écart entre deux tours de spirale ≈ 1,18 case
const THETA0 = (CENTER_R + 0.85) / B; // premier point après la case centrale

interface Geometry {
  points: { x: number; y: number }[]; // index = numéro de case
  road: string; // tracé du chemin
  viewBox: string;
}

function computeGeometry(): Geometry {
  // On marche le long de la spirale depuis l'intérieur et on pose une case tous les STEP.
  const inner: { x: number; y: number }[] = [];
  const samples: { x: number; y: number }[] = [];
  let theta = THETA0;
  let acc = STEP; // poser une case dès le départ
  let prev = { x: B * theta * Math.cos(theta), y: B * theta * Math.sin(theta) };
  while (inner.length < FINISH) {
    const p = { x: B * theta * Math.cos(theta), y: B * theta * Math.sin(theta) };
    acc += Math.hypot(p.x - prev.x, p.y - prev.y);
    samples.push(p);
    if (acc >= STEP) {
      inner.push(p);
      acc = 0;
    }
    prev = p;
    theta += 0.01;
  }
  // inner[0] est la case 39 (juste avant l'arrivée), inner[39] la case 0 (départ)
  const points = [...inner].reverse();
  points.push({ x: 0, y: 0 }); // case 40 : arrivée au centre

  const road = samples.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" ");
  // Cadre ajusté à la spirale réelle (elle n'est pas symétrique), avec la place du pion au-dessus des cases.
  const pad = CELL_R + 0.2;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad - 0.45;
  const w = Math.max(...xs) + pad - minX;
  const h = Math.max(...ys) + pad - minY;
  return { points, road, viewBox: `${minX.toFixed(3)} ${minY.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}` };
}

export const GEOMETRY = computeGeometry();

// ---------- Plateau ----------

export function SpiralBoard({ position, pawn, className = "" }: { position: number; pawn: string; className?: string }) {
  const { points, road, viewBox } = GEOMETRY;
  const pawnAt = points[Math.max(0, Math.min(FINISH, position))];
  return (
    <svg viewBox={viewBox} className={`h-auto w-full select-none ${className}`} role="img" aria-label={`Plateau, pion case ${position}`}>
      {/* Chemin */}
      <path d={road} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={CELL_R * 2.3} strokeLinecap="round" strokeLinejoin="round" />
      <path d={road} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.04} strokeDasharray="0.12 0.12" />

      {/* Cases */}
      {board.cases.map((c) => {
        const p = points[c.index];
        const s = CASE_STYLE[c.type];
        const center = c.index === FINISH;
        const r = center ? CENTER_R : CELL_R;
        const passed = c.index < position;
        return (
          <g key={c.index} transform={`translate(${p.x} ${p.y})`} opacity={passed ? 0.45 : 1}>
            <title>{`${c.index} · ${s.label}`}</title>
            <circle r={r} className={s.fill} stroke="#1e1033" strokeWidth={0.05} />
            <text y={center ? 0.05 : -0.02} textAnchor="middle" dominantBaseline="central" fontSize={center ? 0.75 : 0.36}>
              {s.icon}
            </text>
            {!center && (
              <text y={0.29} textAnchor="middle" dominantBaseline="central" fontSize={0.15} fontWeight={800} fill="#1e1033" opacity={0.75}>
                {c.index}
              </text>
            )}
          </g>
        );
      })}

      {/* Pion */}
      <motion.g
        initial={false}
        animate={{ x: pawnAt.x, y: pawnAt.y }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <motion.circle
          r={CELL_R + 0.08}
          fill="none"
          stroke="#ffc94d"
          strokeWidth={0.07}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        />
        <text y={-0.38} textAnchor="middle" dominantBaseline="central" fontSize={0.62} style={{ filter: "drop-shadow(0 0.04px 0.06px rgba(0,0,0,.6))" }}>
          {pawn}
        </text>
      </motion.g>
    </svg>
  );
}
