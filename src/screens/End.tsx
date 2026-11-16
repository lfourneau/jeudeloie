import { bestMoments, complicity, heartCount } from "@rules";
import { motion } from "framer-motion";
import { useState } from "react";
import { Stars } from "../components/Stars";
import { Button, Card, ErrorText, Screen } from "../components/ui";
import { actions } from "../lib/actions";
import type { GameData } from "../lib/useGame";

export function End({ data, onLeave }: { data: GameData; onLeave: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const win = data.game.outcome === "win";
  const played = data.rounds.filter((r) => r.final_score !== null);
  const pct = complicity(played.map((r) => ({ final_score: Number(r.final_score), heart: r.heart })));
  const best = bestMoments(played.map((r) => ({ ...r, final_score: Number(r.final_score) })));
  const hearts = heartCount(played);

  const rematch = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.rematch(data.room.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  return (
    <Screen>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="pt-6 text-center">
        <div className="text-7xl">{win ? "🏆" : "🌧️"}</div>
        <h1 className="mt-3 font-display text-4xl font-bold">{win ? "Victoire !" : "Presque…"}</h1>
        <p className="mt-2 text-muted">
          {win
            ? `Arrivée atteinte en ${data.game.turns_counted} tours.`
            : `Le pion s'est arrêté case ${data.game.position} après 15 tours.`}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-sm font-bold text-muted">Complicité</p>
          <p className="font-display text-4xl font-bold text-gold">{pct}%</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm font-bold text-muted">Coups de cœur</p>
          <p className="font-display text-4xl font-bold text-rose">❤️ {hearts}</p>
        </Card>
      </div>

      {best.length > 0 && (
        <Card>
          <p className="mb-3 font-display text-xl font-semibold">Vos meilleurs moments</p>
          <ol className="flex flex-col gap-3">
            {best.map((r) => {
              const answerer = data.players.find((p) => p.seat === r.answerer_seat);
              return (
                <li key={r.id} className="rounded-2xl bg-night/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted">Tour {r.turn_number}</span>
                    <Stars score={r.final_score} size={16} />
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="text-mint">Question :</span> {data.secrets[r.id]?.question_text}
                  </p>
                  <p className="my-1 font-display text-2xl font-bold">
                    {r.answer_text} <span className="text-sm font-normal text-muted">— {answerer?.name}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-rose-soft">Devinée :</span> {r.guess_text} {r.heart && "❤️"}
                  </p>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <ErrorText>{error}</ErrorText>
      <Button onClick={rematch} busy={busy}>
        Rejouer
      </Button>
      <Button variant="ghost" onClick={onLeave}>
        Quitter
      </Button>
    </Screen>
  );
}
