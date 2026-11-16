import { useState } from "react";
import { Button, Card, Dots, ErrorText } from "../components/ui";
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
      <Card className="text-center">
        <div className="text-5xl">{round.appeal_manual ? "✍️" : "⚖️"}</div>
        <p className="mt-2 font-display text-2xl font-semibold">{round.appeal_manual ? "À vous de noter" : "Appel !"}</p>
        <p className="mt-1 text-sm text-muted">
          Chacun donne une note en secret. La moyenne{round.appeal_manual ? "" : " remplace celle du juge"}.
        </p>
      </Card>
      <Card className="!p-4 text-sm">
        <p>
          <span className="text-mint">Vraie question :</span> {secret?.question_text}
        </p>
        <p className="mt-1">
          <span className="text-rose-soft">{isAnswerer ? `${partner.name} a deviné` : "Ta question"} :</span> {round.guess_text}
        </p>
      </Card>
      {done ? (
        <Card className="py-8 text-center">
          <p className="font-display text-xl font-semibold">
            Note envoyée. {partner.name} réfléchit… <Dots />
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`aspect-square rounded-2xl font-display text-2xl font-bold transition ${
                  score === n ? "scale-110 bg-gold text-night" : "bg-plum-light"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="h-5 text-center text-sm text-muted">{score !== null && LABELS[score]}</p>
          <ErrorText>{error}</ErrorText>
          <Button onClick={submit} disabled={score === null} busy={busy}>
            Valider ma note
          </Button>
        </Card>
      )}
    </>
  );
}
