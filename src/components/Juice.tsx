// Effets « game juice » dans le style carnet : confettis de papier, coups de tampon, cœurs, secousse.
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { sfx } from "../lib/juice";
import { Icon } from "./Icon";

const LAVIS = ["#E6BE6A", "#E8B4A8", "#A9C0A2", "#9DB4D0"];

/** Pseudo-hasard stable (même dessin à chaque rendu). */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * Salve de morceaux de papier aquarellé et de mini-timbres qui tombent en tournoyant.
 * À placer dans un parent `relative` ; ne capte aucun clic. Supprimée si l'utilisateur réduit les animations.
 */
export function PaperConfetti({ count = 34, spread = 1, origin = "50%" }: { count?: number; spread?: number; origin?: string }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const stamp = i % 9 === 0;
        return {
          stamp,
          color: LAVIS[i % LAVIS.length],
          x: (rand(i) - 0.5) * 360 * spread,
          y: 180 + rand(i + 7) * 260 * spread,
          up: -(70 + rand(i + 3) * 140) * spread,
          rotate: (rand(i + 11) - 0.5) * 720,
          w: stamp ? 16 : 7 + rand(i + 5) * 9,
          h: stamp ? 19 : 5 + rand(i + 9) * 7,
          delay: rand(i + 13) * 0.18,
          radius: `${40 + rand(i + 2) * 20}% ${30 + rand(i + 4) * 30}% ${45 + rand(i + 6) * 20}% ${35 + rand(i + 8) * 25}%`,
        };
      }),
    [count, spread],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className={b.stamp ? "timbre absolute block" : "absolute block"}
          style={{
            left: origin,
            width: b.w,
            height: b.h,
            background: b.stamp ? undefined : b.color,
            borderRadius: b.stamp ? 2 : b.radius,
            border: b.stamp ? undefined : "1px solid rgba(31,47,74,.35)",
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: b.x, y: [0, b.up, b.y], rotate: b.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: 1.7, delay: b.delay, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/**
 * L'élément tombe comme un coup de tampon : il arrive gros et penché, s'écrase, laisse un anneau d'encre.
 * Joue le son du tampon au moment de l'impact.
 */
export function StampIn({
  children,
  delay = 0,
  rotate = -4,
  className = "",
  sound = true,
}: {
  children: ReactNode;
  delay?: number;
  rotate?: number;
  className?: string;
  sound?: boolean;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!sound) return;
    const t = window.setTimeout(() => sfx.stamp(), (delay + (reduce ? 0 : 0.22)) * 1000);
    return () => window.clearTimeout(t);
  }, [delay, reduce, sound]);
  return (
    <span className={`relative inline-block ${className}`}>
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-[-10%] rounded-[46%_54%_42%_58%/52%_44%_56%_48%] border-2 border-cachet/50"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.35, opacity: [0, 0.8, 0] }}
          transition={{ delay: delay + 0.2, duration: 0.55 }}
        />
      )}
      <motion.span
        className="inline-block"
        initial={reduce ? { opacity: 0 } : { scale: 1.9, rotate: rotate - 14, opacity: 0 }}
        animate={{ scale: 1, rotate, opacity: 1 }}
        transition={reduce ? { delay, duration: 0.2 } : { delay, type: "spring", stiffness: 520, damping: 17, mass: 0.8 }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Petits cœurs au trait qui jaillissent d'un bouton (rejouer en changeant `burstKey`). */
export function HeartBurst({ burstKey }: { burstKey: number }) {
  const reduce = useReducedMotion();
  if (reduce || burstKey === 0) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + rand(i + burstKey) * 0.5;
        const d = 46 + rand(i * 3 + burstKey) * 30;
        return (
          <motion.span
            key={`${burstKey}-${i}`}
            className="absolute text-cachet"
            initial={{ x: 0, y: 0, scale: 0.3, opacity: 1, rotate: 0 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d - 14, scale: 1, opacity: 0, rotate: (rand(i) - 0.5) * 50 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          >
            <Icon name="coeur" size={16} fill={i % 2 ? "#E8B4A8" : "none"} />
          </motion.span>
        );
      })}
    </span>
  );
}

/** Secousse d'un bloc (`<motion.div animate={controls}>`) ; sans effet si les animations sont réduites. */
export function useShake(strength = 6) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const shake = useCallback(() => {
    if (reduce) return;
    void controls.start({
      x: [0, -strength, strength, -strength * 0.66, strength * 0.66, 0],
      transition: { duration: 0.4 },
    });
  }, [controls, reduce, strength]);
  return { controls, shake };
}

/** Quelques étincelles à l'encre (chance, tremplin). */
export function Sparkles({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  if (!show || reduce) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {Array.from({ length: 6 }, (_, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          width={18}
          height={18}
          className="absolute text-encre"
          style={{ left: `${10 + rand(i) * 80}%`, top: `${10 + rand(i + 4) * 70}%` }}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{ scale: [0, 1.1, 0], opacity: [0, 1, 0], rotate: 45 }}
          transition={{ duration: 0.9, delay: i * 0.08 }}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
        >
          <path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5" />
        </motion.svg>
      ))}
    </span>
  );
}
