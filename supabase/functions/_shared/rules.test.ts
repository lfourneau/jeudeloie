import { describe, expect, it } from "vitest";
import board from "../../../content/board.json";
import questions from "../../../content/questions.json";
import {
  appealAverage,
  bestMoments,
  type Board,
  complicity,
  drawQuestion,
  finalScore,
  FINISH,
  generateRoomCode,
  heartCount,
  MAX_TURNS,
  mediaForCase,
  normalizeRoomCode,
  type Question,
  resolveTurn,
  spinWheel,
  validateAnswer,
  validateBoard,
  validateGuess,
  WHEEL_SEGMENTS,
  wheelLevel,
} from "./rules.ts";

const B = board as Board;
const Q = questions as Question[];
const fixed = (v: number) => () => v;

describe("contenu", () => {
  it("le plateau est valide", () => {
    expect(validateBoard(B)).toEqual([]);
  });
  it("25 questions par média du MVP, ids uniques", () => {
    for (const m of ["mot", "nombre", "emojis"]) expect(Q.filter((q) => q.media === m)).toHaveLength(25);
    expect(new Set(Q.map((q) => q.id)).size).toBe(Q.length);
    for (const q of Q) expect(["leger", "souvenirs", "futur", "profond"]).toContain(q.theme);
  });
  it("environ 70 % de cases média", () => {
    const inner = B.cases.slice(1, FINISH);
    const media = inner.filter((c) => ["mot", "nombre", "emojis", "dessin", "photo"].includes(c.type));
    expect(media.length / inner.length).toBeGreaterThan(0.6);
    expect(media.length / inner.length).toBeLessThan(0.8);
  });
});

describe("mediaForCase", () => {
  it("départ → mot", () => expect(mediaForCase(B, 0)).toBe("mot"));
  it("case média → son média", () => {
    expect(mediaForCase(B, 2)).toBe("nombre");
    expect(mediaForCase(B, 3)).toBe("emojis");
  });
  it("dessin et photo → mot tant qu'ils ne sont pas prêts", () => {
    expect(B.cases[6].type).toBe("dessin");
    expect(mediaForCase(B, 6)).toBe("mot");
    expect(B.cases[12].type).toBe("photo");
    expect(mediaForCase(B, 12)).toBe("mot");
  });
  it("case spéciale → média de la case média précédente", () => {
    expect(B.cases[4].type).toBe("tremplin");
    expect(mediaForCase(B, 4)).toBe("emojis");
  });
});

describe("drawQuestion", () => {
  it("ne tire que dans le bon média et évite les questions jouées", () => {
    const mots = Q.filter((q) => q.media === "mot");
    const used = mots.slice(0, 24).map((q) => q.id);
    const q = drawQuestion(Q, "mot", used, fixed(0));
    expect(q.id).toBe(mots[24].id);
  });
  it("recycle quand le paquet est épuisé", () => {
    const used = Q.filter((q) => q.media === "nombre").map((q) => q.id);
    expect(drawQuestion(Q, "nombre", used, fixed(0.999)).media).toBe("nombre");
  });
});

describe("validateAnswer", () => {
  it("mot", () => {
    expect(validateAnswer("mot", "  chocolat ")).toEqual({ ok: true, value: "chocolat" });
    expect(validateAnswer("mot", "deux mots").ok).toBe(false);
    expect(validateAnswer("mot", "").ok).toBe(false);
    expect(validateAnswer("mot", "a".repeat(31)).ok).toBe(false);
    expect(validateAnswer("mot", "a".repeat(30)).ok).toBe(true);
    expect(validateAnswer("mot", 42).ok).toBe(false);
  });
  it("nombre", () => {
    expect(validateAnswer("nombre", "3")).toEqual({ ok: true, value: "3" });
    expect(validateAnswer("nombre", "2,5")).toEqual({ ok: true, value: "2.5" });
    expect(validateAnswer("nombre", "-7.25")).toEqual({ ok: true, value: "-7.25" });
    expect(validateAnswer("nombre", "trois").ok).toBe(false);
    expect(validateAnswer("nombre", "1e5").ok).toBe(false);
    expect(validateAnswer("nombre", "3 4").ok).toBe(false);
  });
  it("emojis", () => {
    expect(validateAnswer("emojis", "🏖️🍹😎")).toEqual({ ok: true, value: "🏖️🍹😎" });
    expect(validateAnswer("emojis", "❤️")).toEqual({ ok: true, value: "❤️" });
    expect(validateAnswer("emojis", "👨‍👩‍👧 🇫🇷").ok).toBe(true);
    expect(validateAnswer("emojis", "🍕🍕🍕🍕").ok).toBe(false);
    expect(validateAnswer("emojis", "pizza").ok).toBe(false);
    expect(validateAnswer("emojis", "🍕a").ok).toBe(false);
    expect(validateAnswer("emojis", "🍕1").ok).toBe(false);
  });
  it("devinette", () => {
    expect(validateGuess("  Ton plat préféré ? ")).toEqual({ ok: true, value: "Ton plat préféré ?" });
    expect(validateGuess("").ok).toBe(false);
    expect(validateGuess("x".repeat(251)).ok).toBe(false);
  });
});

describe("notes", () => {
  it("moyenne d'appel arrondie au demi-point", () => {
    expect(appealAverage([3, 4])).toBe(3.5);
    expect(appealAverage([5, 4])).toBe(4.5);
    expect(appealAverage([0, 1])).toBe(0.5);
    expect(appealAverage([2, 2])).toBe(2);
  });
  it("note finale = base + cœur, plafonnée à 5", () => {
    expect(finalScore(3, false)).toBe(3);
    expect(finalScore(3, true)).toBe(4);
    expect(finalScore(5, true)).toBe(5);
    expect(finalScore(4.5, true)).toBe(5);
  });
});

describe("roue", () => {
  it("niveaux selon la note finale", () => {
    expect([0, 1, 1.5, 1.99].map(wheelLevel)).toEqual([0, 0, 0, 0]);
    expect([2, 2.5].map(wheelLevel)).toEqual([1, 1]);
    expect([3, 3.5].map(wheelLevel)).toEqual([2, 2]);
    expect([4, 4.5, 5].map(wheelLevel)).toEqual([3, 3, 3]);
  });
  it("parts conformes à la spec", () => {
    expect(WHEEL_SEGMENTS).toEqual([
      [1, 1, 2, 2, 3],
      [1, 2, 2, 3, 3, 4],
      [2, 3, 3, 4, 4, 5],
      [3, 4, 4, 5, 5, 6],
    ]);
  });
  it("tirage uniforme parmi les parts", () => {
    expect(spinWheel(0, fixed(0))).toEqual({ level: 0, segmentIndex: 0, steps: 1 });
    expect(spinWheel(3, fixed(0.999))).toEqual({ level: 3, segmentIndex: 5, steps: 6 });
    const counts = new Map<number, number>();
    for (let i = 0; i < 6000; i++) {
      const r = spinWheel(1, fixed(i / 6000));
      counts.set(r.segmentIndex, (counts.get(r.segmentIndex) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual([1000, 1000, 1000, 1000, 1000, 1000]);
  });
});

describe("resolveTurn", () => {
  it("avance du résultat de la roue", () => {
    const r = resolveTurn({ position: 10, turnsCounted: 3, finalScore: 5 }, fixed(0));
    expect(r).toMatchObject({ level: 3, steps: 3, from: 10, to: 13, turnsCounted: 4, outcome: null });
  });
  it("victoire en atteignant la case 40, sans la dépasser", () => {
    const r = resolveTurn({ position: 38, turnsCounted: 14, finalScore: 5 }, fixed(0.999));
    expect(r).toMatchObject({ to: FINISH, outcome: "win" });
  });
  it("défaite à la fin du 15e tour", () => {
    const r = resolveTurn({ position: 20, turnsCounted: MAX_TURNS - 1, finalScore: 0 }, fixed(0));
    expect(r).toMatchObject({ turnsCounted: MAX_TURNS, outcome: "lose" });
  });
  it("la victoire l'emporte au 15e tour", () => {
    const r = resolveTurn({ position: 39, turnsCounted: MAX_TURNS - 1, finalScore: 0 }, fixed(0));
    expect(r.outcome).toBe("win");
  });
  it("une partie parfaite gagne en 15 tours au plus, une partie nulle perd", () => {
    let pos = 0;
    let turns = 0;
    let outcome = null;
    while (!outcome) {
      const r = resolveTurn({ position: pos, turnsCounted: turns, finalScore: 0 }, fixed(0));
      pos = r.to;
      turns = r.turnsCounted;
      outcome = r.outcome;
    }
    expect(outcome).toBe("lose");
    expect(turns).toBe(MAX_TURNS);
  });
});

describe("bilan", () => {
  const rounds = [
    { turn_number: 1, final_score: 5, heart: true },
    { turn_number: 2, final_score: 2, heart: false },
    { turn_number: 3, final_score: 4, heart: true },
    { turn_number: 4, final_score: 5, heart: false },
    { turn_number: 5, final_score: null, heart: false },
  ];
  it("complicité en %", () => {
    expect(complicity(rounds)).toBe(80);
    expect(complicity([])).toBe(0);
  });
  it("3 meilleurs moments", () => {
    expect(bestMoments(rounds).map((r) => r.turn_number)).toEqual([1, 4, 3]);
  });
  it("cœurs", () => expect(heartCount(rounds)).toBe(2));
});

describe("codes de salle", () => {
  it("4 lettres majuscules", () => {
    for (let i = 0; i < 50; i++) expect(generateRoomCode()).toMatch(/^[A-Z]{4}$/);
  });
  it("normalisation", () => expect(normalizeRoomCode(" ab-cd9e ")).toBe("ABCD"));
});
