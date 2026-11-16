import { animate, motion, useAnimationControls, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { buzz, sfx } from "../lib/juice";

const LAVIS = ["#9DB4D0", "#E6BE6A", "#E8B4A8", "#A9C0A2"];

/**
 * Regroupe les parts identiques en un seul secteur (les parts sont triées) :
 * `[1,1,2,2,3]` → 1 sur 2/5 de la roue, 2 sur 2/5, 3 sur 1/5. Les probabilités ne changent pas.
 */
function sectors(segments: readonly number[]) {
  const n = segments.length;
  const out: { value: number; from: number; to: number }[] = [];
  segments.forEach((v, i) => {
    const last = out[out.length - 1];
    if (last && last.value === v) last.to = ((i + 1) / n) * 360;
    else out.push({ value: v, from: (i / n) * 360, to: ((i + 1) / n) * 360 });
  });
  return out;
}

/**
 * Roue aquarelle : le résultat (segmentIndex) est déjà tiré par le serveur,
 * on anime seulement jusqu'à lui.
 */
export function Wheel({
  segments,
  segmentIndex,
  onDone,
  duration = 2.6,
}: {
  segments: readonly number[];
  segmentIndex: number;
  onDone?: () => void;
  duration?: number;
}) {
  const n = segments.length;
  const slice = 360 / n;
  const rotation = useMotionValue(0);
  const reduce = useReducedMotion();
  const size = 260;
  const secs = sectors(segments);
  const arrow = useAnimationControls();

  // Cliquetis : chaque trait d'encre entre deux secteurs qui passe sous la flèche fait « tic »
  // et fait sursauter la flèche. Le ralentissement de la roue espace naturellement les tics.
  useEffect(() => {
    if (reduce) return;
    let prev = rotation.get();
    return rotation.on("change", (r) => {
      const crossed = secs.some((sec) => Math.floor((prev + sec.from) / 360) !== Math.floor((r + sec.from) / 360));
      prev = r;
      if (crossed) {
        sfx.tick();
        void arrow.start({ rotate: [-22, 0], transition: { duration: 0.18, ease: "easeOut" } });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, reduce, n]);

  useEffect(() => {
    // La flèche est en haut : on amène le milieu de la part tirée sous la flèche.
    const target = 360 * 4 + (360 - (segmentIndex + 0.5) * slice);
    if (reduce) {
      rotation.set(target);
      const t = window.setTimeout(() => onDone?.(), 300);
      return () => window.clearTimeout(t);
    }
    const controls = animate(rotation, target, {
      duration,
      ease: [0.15, 0.8, 0.2, 1],
      onComplete: () => {
        sfx.stamp();
        buzz(30);
        onDone?.();
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, n]);

  const gradient = `conic-gradient(${secs
    .map((s, i) => `${LAVIS[i % LAVIS.length]} ${s.from}deg ${s.to}deg`)
    .join(", ")})`;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Flèche à l'encre */}
      <div className="absolute -top-5 left-1/2 z-10 -translate-x-1/2">
        <motion.svg viewBox="0 0 30 34" width={30} height={34} animate={arrow} style={{ originY: 0.1 }} aria-hidden>
          <path d="M3 3c8 .6 16 .4 24-.2L15.4 31Z" fill="#1F2F4A" stroke="#1F2F4A" strokeWidth={2} strokeLinejoin="round" />
        </motion.svg>
      </div>
      <motion.div
        className="relative h-full w-full rounded-full"
        style={{
          rotate: rotation,
          backgroundImage: gradient,
          border: "2px solid #1F2F4A",
          outline: "2px dashed #B5442E",
          outlineOffset: 9,
        }}
      >
        {/* traits d'encre entre les secteurs */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          {secs.map((s) => {
            const a = ((s.from - 90) * Math.PI) / 180;
            return (
              <line
                key={s.from}
                x1={50}
                y1={50}
                x2={50 + 50 * Math.cos(a)}
                y2={50 + 50 * Math.sin(a)}
                stroke="#1F2F4A"
                strokeOpacity={0.6}
                strokeWidth={0.7}
              />
            );
          })}
        </svg>
        {secs.map((s) => {
          const mid = (((s.from + s.to) / 2 - 90) * Math.PI) / 180;
          return (
            <span
              key={s.from}
              className="absolute font-display text-[26px] leading-none font-bold text-encre"
              style={{
                left: `${50 + 33 * Math.cos(mid)}%`,
                top: `${50 + 33 * Math.sin(mid)}%`,
                transform: `translate(-50%, -50%) rotate(${(s.from + s.to) / 2}deg)`,
              }}
            >
              +{s.value}
            </span>
          );
        })}
      </motion.div>
      {/* reflet clair et bord légèrement assombri, fixes */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 40% 35%, rgba(255,255,255,.4), transparent 55%), radial-gradient(circle, transparent 62%, rgba(31,47,74,.16) 100%)",
        }}
      />
      {/* moyeu */}
      <div className="cachet absolute top-1/2 left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
