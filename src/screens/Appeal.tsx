import { useState } from "react";
import { Icon, Sheep } from "../components/Icon";
import { Button, Card, Dots, ErrorText, Label, Letter } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

const LABELS = ["Aucun rapport", "Lointain", "Vaguement lié", "Bon thème", "Presque !", "Exactement"];

/** Appel (ou notation manuelle si le juge a échoué) : chacun note en secret de 0 à 5. */
export function Appeal({ data, round, secret, me, partner, isAnswerer }: TurnProps) {
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = String(me.seat) in round.appeal_scores;

  const submit = async () => {
    if (score === null) return;
    setBusy(true);
    setError(null);
    try {
      await actions.submitAppealScore(data.room.id, score);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  return (
    <>
      <Card tilt={-0.5} className="flex items-center gap-4">
        {round.appeal_manual ? <Icon name="plume" size={64} className="text-encre-claire" /> : <Sheep size={80} />}
        <div>
          <p className="titre text-[28px]">{round.appeal_manual ? "À vous de noter" : "Appel !"}</p>
          <p className="text-muted italic">
            {round.appeal_manual
              ? "Le mouton s'est endormi. Chacun donne une note en secret, la moyenne compte."
              : "Le mouton cède sa place. Chacun donne une note en secret, la moyenne remplace la sienne."}
          </p>
        </div>
      </Card>
      <Letter>
        <Label className="text-cachet">Vraie question</Label>
        <p className="break-words">{secret?.question_text}</p>
        <Label>{isAnswerer ? `${partner.name} a deviné` : "Ta devinette"}</Label>
        <p className="break-words">{round.guess_text}</p>
      </Letter>
      {done ? (
        <Card className="py-8 text-center">
          <p className="titre text-2xl">
            Note envoyée. {partner.name} réfléchit… <Dots />
          </p>
        </Card>
      ) : (
        <Card tilt={0.3} className="flex flex-col gap-3">
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                aria-pressed={score === n}
                className={`forme-${(n % 4) + 1} flex aspect-square min-h-11 items-center justify-center border-[1.5px] border-encre/55 font-display text-2xl font-bold transition ${
                  score === n ? "lavis-ocre scale-110 ring-2 ring-cachet" : "bg-lettre"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="h-6 text-center text-muted italic">{score !== null && LABELS[score]}</p>
          <ErrorText>{error}</ErrorText>
          <Button onClick={submit} disabled={score === null} busy={busy}>
            Envoyer ma note
          </Button>
        </Card>
      )}
    </>
  );
}
