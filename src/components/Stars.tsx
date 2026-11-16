import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { sfx } from "../lib/juice";

const STAR = "M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.7Z";

/** Note sur 5 en étoiles dessinées à l'encre, pleines en ocre. Gère les demi-points (moyenne d'appel). */
export function Stars({ score, size = 36, sound = true }: { score: number; size?: number; sound?: boolean }) {
  const reduce = useReducedMotion();
  // Un petit clic par étoile remplie, au moment où elle se pose.
  useEffect(() => {
    if (!sound) return;
    const filled = Math.ceil(Math.max(0, Math.min(5, score)));
    const timers = Array.from({ length: filled }, (_, i) => window.setTimeout(() => sfx.tick(), (0.15 * i + 0.12) * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [score, sound]);
  return (
    <div className="flex justify-center gap-1" role="img" aria-label={`${score} sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        const id = `star-${i}-${Math.round(fill * 100)}`;
        return (
          <motion.svg
            key={i}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            initial={reduce ? false : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: ((i * 7) % 5) - 2 }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 15 }}
            aria-hidden
          >
            <defs>
              <clipPath id={id}>
                <rect x="0" y="0" width={24 * fill} height="24" />
              </clipPath>
            </defs>
            <path d={STAR} fill="#E6BE6A" clipPath={`url(#${id})`} />
            <path d={STAR} fill="none" stroke="#1F2F4A" strokeWidth={1.5} strokeLinejoin="round" />
          </motion.svg>
        );
      })}
    </div>
  );
}
