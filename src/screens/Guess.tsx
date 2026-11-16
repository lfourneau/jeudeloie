import { GUESS_MAX_LENGTH, validateGuess } from "@rules";
import { useState } from "react";
import { AnswerView } from "../components/AnswerView";
import { Button, Card, Dots, ErrorText, MEDIA_LABEL } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

export function Guess({ data, round, partner, isAnswerer }: TurnProps) {
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAnswerer) {
    return (
      <Card className="py-8 text-center">
        <p className="text-sm text-muted">Ta réponse</p>
        <div className="my-4">
          <AnswerView round={round} />
        </div>
        <p className="font-display text-xl font-semibold">
          {partner.name} devine… <Dots />
        </p>
      </Card>
    );
  }

  const submit = async () => {
    const v = validateGuess(guess);
    if (!v.ok) return setError(v.error);
    setBusy(true);
    setError(null);
    try {
      await actions.submitGuess(data.room.id, v.value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="py-8">
        <p className="mb-4 text-center text-sm text-muted">
          {partner.name} a répondu avec {MEDIA_LABEL[round.media].label} {MEDIA_LABEL[round.media].icon}
        </p>
        <AnswerView round={round} />
      </Card>
      <Card className="flex flex-col gap-3">
        <label htmlFor="guess" className="font-display text-lg font-semibold">
          Quelle était la question ?
        </label>
        <textarea
          id="guess"
          autoFocus
          rows={3}
          value={guess}
          maxLength={GUESS_MAX_LENGTH}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Ex. : ta saison préférée ?"
          className="resize-none rounded-2xl bg-night/70 px-4 py-3 text-lg outline-none ring-2 ring-white/10 focus:ring-rose"
        />
        <p className="text-right text-xs text-muted">
          {guess.length}/{GUESS_MAX_LENGTH}
        </p>
        <ErrorText>{error}</ErrorText>
        <Button onClick={submit} busy={busy} disabled={!guess.trim()}>
          Proposer
        </Button>
      </Card>
    </>
  );
}
