import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button, Card } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

const STALE_MS = 50_000;

export function Judging({ data, isAnswerer }: TurnProps) {
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const since = Date.now() - new Date(data.game.updated_at).getTime();
    const t = window.setTimeout(() => setStale(true), Math.max(0, STALE_MS - since));
    return () => window.clearTimeout(t);
  }, [data.game.updated_at]);

  return (
    <Card className="py-12 text-center">
      <motion.div
        animate={{ rotate: [0, -12, 12, -12, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.4 }}
        className="text-7xl"
      >
        🧑‍⚖️
      </motion.div>
      <p className="mt-6 font-display text-2xl font-semibold">Le juge délibère…</p>
      <p className="mt-2 text-muted">Il compare la question devinée à la vraie.</p>
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
          Relancer le juge
        </Button>
      )}
    </Card>
  );
}
