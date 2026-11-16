import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect } from "react";

const COLORS = ["#ff5c8a", "#6ec3ff", "#ffc94d", "#b79bff", "#5fe3b5", "#ff9ab5"];

/**
 * Roue décorative : le résultat (segmentIndex) est déjà tiré par le serveur,
 * on anime seulement jusqu'à lui.
 */
export function Wheel({
  segments,
  segmentIndex,
  onDone,
  duration = 3.5,
}: {
  segments: readonly number[];
  segmentIndex: number;
  onDone?: () => void;
  duration?: number;
}) {
  const n = segments.length;
  const angle = 360 / n;
  const rotation = useMotionValue(0);
  const size = 260;
  const r = size / 2;

  useEffect(() => {
    // Le pointeur est en haut : on amène le centre du segment gagnant à 0°.
    const target = 360 * 5 + (360 - (segmentIndex + 0.5) * angle);
    const controls = animate(rotation, target, { duration, ease: [0.15, 0.85, 0.25, 1], onComplete: onDone });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, n]);

  const arc = (i: number) => {
    const a0 = ((i * angle - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * angle - 90) * Math.PI) / 180;
    const x0 = r + r * Math.cos(a0);
    const y0 = r + r * Math.sin(a0);
    const x1 = r + r * Math.cos(a1);
    const y1 = r + r * Math.sin(a1);
    return `M${r},${r} L${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} Z`;
  };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-3xl drop-shadow">🔻</div>
      <motion.svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ rotate: rotation }}>
        {segments.map((v, i) => {
          const mid = (((i + 0.5) * angle - 90) * Math.PI) / 180;
          return (
            <g key={i}>
              <path d={arc(i)} fill={COLORS[i % COLORS.length]} stroke="#1e1033" strokeWidth={3} />
              <text
                x={r + r * 0.65 * Math.cos(mid)}
                y={r + r * 0.65 * Math.sin(mid)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={30}
                fontWeight={700}
                fill="#1e1033"
                fontFamily="Fredoka, sans-serif"
              >
                +{v}
              </text>
            </g>
          );
        })}
        <circle cx={r} cy={r} r={22} fill="#1e1033" />
      </motion.svg>
    </div>
  );
}
