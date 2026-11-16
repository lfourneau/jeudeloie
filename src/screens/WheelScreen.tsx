import { FINISH, WHEEL_SEGMENTS } from "@rules";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Board } from "../components/Board";
import { Stars } from "../components/Stars";
import { Button, Card } from "../components/ui";
import { Wheel } from "../components/Wheel";
import type { Round } from "../lib/types";

const LEVEL_LABEL = ["Roue de consolation", "Petite roue", "Belle roue", "Roue en or"];

/** Animation seulement : le tirage et le déplacement sont déjà enregistrés par le serveur. */
export function WheelScreen({ round, onDone }: { round: Round; onDone: () => void }) {
  const level = round.wheel_level ?? 0;
  const segments = WHEEL_SEGMENTS[level];
  const from = round.case_index;
  const to = round.position_after ?? from;
  const [stage, setStage] = useState<"spin" | "move" | "done">("spin");
  const [pos, setPos] = useState(from);

  useEffect(() => {
    if (stage !== "move") return;
    if (pos >= to) {
      const t = window.setTimeout(() => setStage("done"), 600);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setPos((p) => p + 1), 280);
    return () => window.clearTimeout(t);
  }, [stage, pos, to]);

  useEffect(() => {
    if (stage !== "done") return;
    const t = window.setTimeout(onDone, 1200);
    return () => window.clearTimeout(t);
  }, [stage, onDone]);

  return (
    <>
      <Card className="text-center">
        <p className="text-sm font-bold text-muted">Note finale du tour</p>
        <div className="my-2">
          <Stars score={round.final_score ?? 0} size={28} />
        </div>
        <p className="font-display text-xl font-semibold text-gold">{LEVEL_LABEL[level]}</p>
      </Card>

      <div className="py-2">
        <Wheel segments={segments} segmentIndex={round.wheel_index ?? 0} onDone={() => setStage("move")} />
      </div>

      <AnimatePresence>
        {stage !== "spin" && (
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center font-display text-4xl font-bold text-gold"
          >
            +{round.wheel_result} case{(round.wheel_result ?? 0) > 1 ? "s" : ""} !
          </motion.p>
        )}
      </AnimatePresence>

      <Card>
        <LayoutGroup id="wheel-board">
          <Board position={pos} />
        </LayoutGroup>
        {stage === "done" && to >= FINISH && <p className="mt-3 text-center font-display text-xl">Arrivée atteinte ! 🎉</p>}
      </Card>
      <Button variant="ghost" onClick={onDone}>
        Passer l'animation
      </Button>
    </>
  );
}
