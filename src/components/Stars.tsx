import { motion } from "framer-motion";

/** Note sur 5 en étoiles, animée. Gère les demi-points (moyenne d'appel). */
export function Stars({ score, size = 36 }: { score: number; size?: number }) {
  return (
    <div className="flex justify-center gap-1" aria-label={`${score} sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, score - i));
        return (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 15 }}
            className="relative"
            style={{ width: size, height: size }}
          >
            <span className="absolute inset-0 text-white/15" style={{ fontSize: size, lineHeight: 1 }}>★</span>
            <span
              className="absolute inset-0 overflow-hidden text-gold"
              style={{ width: `${fill * 100}%`, fontSize: size, lineHeight: 1 }}
            >
              ★
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
