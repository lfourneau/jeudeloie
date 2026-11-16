import { FINISH, WHEEL_SEGMENTS } from "@rules";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CASE_STYLE } from "../components/cases";
import { SpiralBoard } from "../components/SpiralBoard";
import { Stars } from "../components/Stars";
import { Button, Card } from "../components/ui";
import { Wheel } from "../components/Wheel";
import type { Round } from "../lib/types";

const LEVEL_LABEL = ["Roue de consolation", "Petite roue", "Belle roue", "Roue en or"];
const STEP_MS = 280;

type Stage = "spin" | "move" | "effect" | "effect-move" | "done";

/**
 * Animation seulement : le tirage, le déplacement et l'effet de case sont déjà enregistrés par le serveur.
 * `onPosition` permet au grand plateau (ordinateur) de suivre le pion pendant l'animation.
 */
export function WheelScreen({
  round,
  pawn,
  onPosition,
  onDone,
}: {
  round: Round;
  pawn: string;
  onPosition: (p: number) => void;
  onDone: () => void;
}) {
  const level = round.wheel_level ?? 0;
  const from = round.case_index;
  const landed = round.landed_index ?? round.position_after ?? from;
  const to = round.position_after ?? landed;
  const effect = round.case_effect;
  const [stage, setStage] = useState<Stage>("spin");
  const [pos, setPos] = useState(from);

  useEffect(() => onPosition(pos), [pos, onPosition]);

  // Avance (ou recule) d'une case à la fois vers la cible de l'étape en cours.
  useEffect(() => {
    if (stage !== "move" && stage !== "effect-move") return;
    const target = stage === "move" ? landed : to;
    if (pos === target) {
      const next: Stage = stage === "move" && effect ? "effect" : "done";
      const t = window.setTimeout(() => setStage(next), 500);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setPos((p) => p + Math.sign(target - p)), STEP_MS);
    return () => window.clearTimeout(t);
  }, [stage, pos, landed, to, effect]);

  useEffect(() => {
    if (stage === "effect") {
      const t = window.setTimeout(() => setStage("effect-move"), 1800);
      return () => window.clearTimeout(t);
    }
    if (stage === "done") {
      const t = window.setTimeout(onDone, 1300);
      return () => window.clearTimeout(t);
    }
  }, [stage, onDone]);

  const effectStyle = effect ? CASE_STYLE[effect.type as keyof typeof CASE_STYLE] : null;

  return (
    <>
      <Card className="text-center">
        <p className="text-sm font-bold text-muted">Note finale du tour</p>
        <div className="my-2">
          <Stars score={Number(round.final_score ?? 0)} size={28} />
        </div>
        <p className="font-display text-xl font-semibold text-gold">{LEVEL_LABEL[level]}</p>
      </Card>

      <div className="py-2">
        <Wheel segments={WHEEL_SEGMENTS[level]} segmentIndex={round.wheel_index ?? 0} onDone={() => setStage("move")} />
      </div>

      <AnimatePresence mode="wait">
        {stage !== "spin" && stage !== "effect" && (
          <motion.p
            key="steps"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="text-center font-display text-4xl font-bold text-gold"
          >
            +{round.wheel_result} case{(round.wheel_result ?? 0) > 1 ? "s" : ""} !
          </motion.p>
        )}
        {stage === "effect" && effect && effectStyle && (
          <motion.div
            key="effect"
            initial={{ rotateY: 90, scale: 0.8 }}
            animate={{ rotateY: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`mx-auto w-64 rounded-3xl p-5 text-center shadow-2xl ${effectStyle.bg}`}
          >
            <div className="text-5xl">{effectStyle.icon}</div>
            <p className="mt-2 text-xs font-bold tracking-widest uppercase opacity-80">{effectStyle.label}</p>
            <p className="font-display text-2xl font-bold">{effect.label}</p>
            <p className="font-display text-3xl font-bold">
              {effect.delta > 0 ? `+${effect.delta}` : effect.delta}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sur téléphone, le plateau est ici ; sur ordinateur, le grand plateau à gauche suit le pion. */}
      <Card className="lg:hidden">
        <SpiralBoard position={pos} pawn={pawn} />
        {stage === "done" && to >= FINISH && <p className="mt-3 text-center font-display text-xl">Arrivée atteinte ! 🎉</p>}
      </Card>
      {stage === "done" && to >= FINISH && (
        <p className="hidden text-center font-display text-2xl lg:block">Arrivée atteinte ! 🎉</p>
      )}
      <Button variant="ghost" onClick={onDone}>
        Passer l'animation
      </Button>
    </>
  );
}
