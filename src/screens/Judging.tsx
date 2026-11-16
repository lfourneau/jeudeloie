import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Sheep } from "../components/Icon";
import { Button, Card } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

const STALE_MS = 50_000;

export function Judging({ data, isAnswerer }: TurnProps) {
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const since = Date.now() - new Date(data.game.updated_at).getTime();
    const t = window.setTimeout(() => setStale(true), Math.max(0, STALE_MS - since));
    return () => window.clearTimeout(t);
  }, [data.game.updated_at]);

  return (
    <Card tilt={-0.5} className="py-10 text-center">
      <motion.div
        animate={reduce ? undefined : { rotate: [0, -6, 6, -6, 0], y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="mx-auto w-fit"
      >
        <Sheep size={120} />
      </motion.div>
      <p className="titre mt-5 text-[28px]">Le mouton délibère…</p>
      <p className="mt-2 text-muted italic">Il rumine la question devinée et la compare à la vraie.</p>
      {stale && !isAnswerer && (
        <Button
          variant="secondary"
          className="mt-6"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await actions.submitGuess(data.room.id);
            } catch {
              /* déjà relancé par le partenaire : l'état se mettra à jour */
            } finally {
              setBusy(false);
            }
          }}
        >
          Réveiller le mouton
        </Button>
      )}
    </Card>
  );
}
