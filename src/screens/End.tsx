import { bestMoments, complicity, FINISH, heartCount, MAX_TURNS } from "@rules";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AnswerView } from "../components/AnswerView";
import { Stars } from "../components/Stars";
import { BoardPanel, GameLayout } from "../components/Layout";
import { Icon } from "../components/Icon";
import { PaperConfetti, StampIn } from "../components/Juice";
import { GameMenu } from "../components/GameMenu";
import { buzz, sfx } from "../lib/juice";
import { Button, Card, ErrorText, Letter } from "../components/ui";
import { actions } from "../lib/actions";
import type { GameData } from "../lib/useGame";

export function End({ data, onQuit }: { data: GameData; onQuit: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const win = data.game.outcome === "win";
  const played = data.rounds.filter((r) => r.final_score !== null);
  const pct = complicity(played.map((r) => ({ final_score: Number(r.final_score), heart: r.heart })));
  const best = bestMoments(played.map((r) => ({ ...r, final_score: Number(r.final_score) })));
  const hearts = heartCount(played);

  const quit = async () => {
    setError(null);
    try {
      await onQuit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

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

  const name = (seat: number) => data.players.find((p) => p.seat === seat)?.name;

  // Victoire : carillon et confettis. Défaite : rien de bruyant, la feuille se pose doucement.
  useEffect(() => {
    if (!win) return;
    const t = window.setTimeout(() => {
      sfx.chime(true);
      buzz([30, 50, 30, 50, 80]);
    }, 350);
    return () => window.clearTimeout(t);
  }, [win]);

  return (
    <GameLayout
      showBoard
      board={<BoardPanel position={data.game.position} pawn={data.game.pawn} startName={name(0)} endName={name(1)} />}
    >
      <div className="flex justify-end">
        <GameMenu onQuit={onQuit} />
      </div>
      <motion.div
        initial={win ? { opacity: 0 } : { y: -30, rotate: -3, opacity: 0 }}
        animate={{ y: 0, rotate: 0, opacity: 1 }}
        transition={win ? { duration: 0.2 } : { duration: 1.2, ease: [0.3, 0.7, 0.4, 1] }}
        className="relative pt-6 text-center"
      >
        {win && <PaperConfetti count={70} spread={1.5} />}
        <StampIn rotate={-12} delay={0.15} sound={win}>
          <div className="cachet mx-auto flex h-28 w-28 flex-col items-center justify-center font-display font-bold">
            <span className="text-[13px] leading-none">La Poste</span>
            <span className="text-3xl leading-tight">{win ? "Arrivés !" : "Perdu"}</span>
            <span className="text-[13px] leading-none">tour {data.game.turns_counted}</span>
          </div>
        </StampIn>
        <h1 className="titre mt-4 text-[38px] lg:text-[52px]">{win ? "Vous voilà réunis !" : "Presque…"}</h1>
        <p className="mt-2 text-muted italic">
          {win
            ? `Arrivée atteinte en ${data.game.turns_counted} tours.`
            : `Le pion s'est arrêté case ${data.game.position} sur ${FINISH}, après ${MAX_TURNS} tours.`}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <Card tilt={-0.8} className="text-center">
          <p className="font-display text-lg text-muted">Complicité</p>
          <p className="font-display text-5xl font-bold text-cachet">{pct}%</p>
        </Card>
        <Card tilt={0.8} className="text-center">
          <p className="font-display text-lg text-muted">Coups de cœur</p>
          <p className="flex items-center justify-center gap-1.5 font-display text-5xl font-bold text-cachet">
            <Icon name="coeur" size={34} fill="#E8B4A8" /> {hearts}
          </p>
        </Card>
      </div>

      {best.length > 0 && (
        <Letter>
          <p className="titre mb-2 text-[28px]">Vos meilleurs moments</p>
          <ol className="flex flex-col gap-4">
            {best.map((r) => {
              const answerer = data.players.find((p) => p.seat === r.answerer_seat);
              return (
                <li key={r.id} className="border-t border-dashed border-encre/30 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-muted">Tour {r.turn_number}</span>
                    <Stars score={r.final_score} size={18} sound={false} />
                  </div>
                  <p className="break-words">
                    <span className="font-display text-cachet">Question :</span> {data.secrets[r.id]?.question_text}
                  </p>
                  <div className="my-2">
                    <AnswerView round={r} size="sm" />
                    <p className="text-center text-[14px] text-muted italic">réponse de {answerer?.name}</p>
                  </div>
                  <p className="flex flex-wrap items-center gap-1 break-words">
                    <span className="font-display text-encre-claire">Devinée :</span> {r.guess_text}
                    {r.heart && <Icon name="coeur" size={18} fill="#E8B4A8" className="text-cachet" label="coup de cœur" />}
                  </p>
                </li>
              );
            })}
          </ol>
        </Letter>
      )}

      <ErrorText>{error}</ErrorText>
      <Button onClick={rematch} busy={busy}>
        Rejouer une partie
      </Button>
      <Button variant="ghost" onClick={quit}>
        Quitter la partie
      </Button>
    </GameLayout>
  );
}
