import { describe, expect, it } from "vitest";
import board from "../../../content/board.json";
import questions from "../../../content/questions.json";
import {
  answerFilePath,
  appealAverage,
  applyCaseEffect,
  bestMoments,
  type Board,
  buildChoices,
  CHANCE_CARDS,
  CHOICE_COUNT,
  choiceScore,
  complicity,
  drawQuestion,
  effectTargets,
  finalScore,
  FINISH,
  generateRoomCode,
  heartCount,
  INITIAL_JOKERS,
  isJoker,
  isSpecial,
  isValidChoice,
  isValidPawn,
  MALCHANCE_CARDS,
  MAX_TURNS,
  mediaForCase,
  normalizeRoomCode,
  parseInventory,
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
  it("le plateau est valide : 64 cases, départ en 0, arrivée en 63", () => {
    expect(validateBoard(B)).toEqual([]);
    expect(FINISH).toBe(63);
    expect(B.cases).toHaveLength(64);
    expect(B.cases[0].type).toBe("depart");
    expect(B.cases[63].type).toBe("arrivee");
  });
  it("jamais deux cases spéciales d'affilée", () => {
    const special = ["chance", "malchance", "piege", "tremplin"];
    for (let i = 1; i < FINISH - 1; i++) {
      expect(special.includes(B.cases[i].type) && special.includes(B.cases[i + 1].type)).toBe(false);
    }
  });
  it("25 questions par média, ids uniques", () => {
    for (const m of ["mot", "nombre", "emojis", "dessin", "photo", "musique", "gif"]) {
      expect(Q.filter((q) => q.media === m)).toHaveLength(25);
    }
    expect(new Set(Q.map((q) => q.id)).size).toBe(Q.length);
    for (const q of Q) expect(["leger", "souvenirs", "futur", "profond"]).toContain(q.theme);
  });
  it("chaque question a un mot-clé et un thème précis pour les jokers", () => {
    for (const q of Q) {
      expect(q.keyword.trim().length, q.id).toBeGreaterThan(0);
      expect(q.topic.trim().length, q.id).toBeGreaterThan(0);
    }
  });
  it("environ 70 % de cases média", () => {
    const inner = B.cases.slice(1, FINISH);
    const media = inner.filter((c) => ["mot", "nombre", "emojis", "dessin", "photo", "musique", "gif"].includes(c.type));
    expect(media.length / inner.length).toBeGreaterThan(0.6);
    expect(media.length / inner.length).toBeLessThan(0.8);
  });
  it("chaque type de case sert, et seulement des types connus", () => {
    const types = new Set(B.cases.map((c) => c.type));
    for (const t of ["mot", "nombre", "emojis", "dessin", "photo", "musique", "gif", "chance", "malchance", "piege", "tremplin"]) {
      expect(types.has(t as never)).toBe(true);
    }
    expect(types.size).toBe(13);
  });
});

describe("mediaForCase", () => {
  it("départ → mot", () => expect(mediaForCase(B, 0)).toBe("mot"));
  it("case média → son média", () => {
    expect(mediaForCase(B, 2)).toBe("emojis");
    expect(mediaForCase(B, 4)).toBe("nombre");
  });
  it("nouveaux médias", () => {
    expect(mediaForCase(B, 5)).toBe("dessin");
    expect(mediaForCase(B, 7)).toBe("gif");
    expect(mediaForCase(B, 8)).toBe("musique");
    expect(mediaForCase(B, 9)).toBe("photo");
  });
  it("case spéciale → média de la case média précédente", () => {
    expect(B.cases[3].type).toBe("tremplin");
    expect(mediaForCase(B, 3)).toBe("emojis");
    expect(B.cases[6].type).toBe("chance");
    expect(mediaForCase(B, 6)).toBe("dessin");
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
  it("dessin et photo : seul le chemin attendu est accepté", () => {
    const ctx = { roomId: "r1", roundId: "t1" };
    expect(answerFilePath("r1", "t1", "dessin")).toBe("r1/t1.png");
    expect(answerFilePath("r1", "t1", "photo")).toBe("r1/t1.jpg");
    expect(validateAnswer("dessin", "r1/t1.png", ctx).ok).toBe(true);
    expect(validateAnswer("photo", "r1/t1.jpg", ctx).ok).toBe(true);
    expect(validateAnswer("dessin", "r2/t1.png", ctx).ok).toBe(false);
    expect(validateAnswer("photo", "r1/t1.png", ctx).ok).toBe(false);
    expect(validateAnswer("dessin", "r1/t1.png").ok).toBe(false);
  });
  it("musique et gif : identifiants", () => {
    expect(validateAnswer("musique", "3135556").ok).toBe(true);
    expect(validateAnswer("musique", "abc").ok).toBe(false);
    expect(validateAnswer("gif", "xT9IgG50Fb7Mi0prBC").ok).toBe(true);
    expect(validateAnswer("gif", "../../etc").ok).toBe(false);
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
  it("bonus d'originalité, cumulable avec le cœur, plafonné à 5", () => {
    expect(finalScore(2, false, true)).toBe(3);
    expect(finalScore(2, true, true)).toBe(4);
    expect(finalScore(4, true, true)).toBe(5);
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

describe("cases spéciales", () => {
  it("aucun effet n'atterrit sur un timbre (pas d'effet en chaîne, sinon il ne se passerait rien)", () => {
    for (const c of B.cases) {
      for (const t of effectTargets(B, c.index)) expect(isSpecial(B.cases[t].type), `${c.index} → ${t}`).toBe(false);
    }
  });
  it("validateBoard refuse un effet qui atterrit sur un timbre", () => {
    const bad: Board = { cases: B.cases.map((c) => ({ ...c })) };
    const i = B.cases.find((c) => c.type === "piege")!.index;
    bad.cases[i - 3].type = "chance";
    expect(validateBoard(bad).some((e) => e.includes(`case ${i} (piege)`))).toBe(true);
  });
  it("cibles des effets", () => {
    const trap = B.cases.find((c) => c.type === "piege")!.index;
    expect(effectTargets(B, trap)).toEqual([trap - 3]);
    expect(effectTargets(B, 1)).toEqual([]);
  });
  const at = (type: string) => B.cases.find((c) => c.type === type)!.index;
  it("piège : recule de 3", () => {
    const i = at("piege");
    expect(applyCaseEffect(B, i)).toEqual({ effect: { type: "piege", label: "Piège !", delta: -3 }, to: i - 3 });
  });
  it("tremplin : avance de 2, sans effet en chaîne", () => {
    const i = at("tremplin");
    const r = applyCaseEffect(B, i);
    expect(r.to).toBe(i + 2);
    expect(r.effect?.delta).toBe(2);
  });
  it("chance : carte qui fait avancer, tirage uniforme", () => {
    const i = at("chance");
    CHANCE_CARDS.forEach((card, k) => {
      const r = applyCaseEffect(B, i, fixed((k + 0.5) / CHANCE_CARDS.length));
      expect(r.effect).toEqual({ type: "chance", ...card });
      expect(r.to).toBe(i + card.delta);
    });
    expect(CHANCE_CARDS.every((c) => c.delta > 0)).toBe(true);
  });
  it("malchance : carte qui fait reculer", () => {
    const i = at("malchance");
    MALCHANCE_CARDS.forEach((card, k) => {
      const r = applyCaseEffect(B, i, fixed((k + 0.5) / MALCHANCE_CARDS.length));
      expect(r.to).toBe(i + card.delta);
    });
    expect(MALCHANCE_CARDS.every((c) => c.delta < 0)).toBe(true);
  });
  it("case média : aucun effet", () => {
    expect(applyCaseEffect(B, 1)).toEqual({ effect: null, to: 1 });
  });
  it("bornes : jamais sous 0 ni au-delà de l'arrivée", () => {
    const tiny: Board = { cases: B.cases.map((c) => ({ ...c })) };
    tiny.cases[1].type = "piege";
    tiny.cases[FINISH - 1].type = "chance";
    expect(applyCaseEffect(tiny, 1).to).toBe(0);
    expect(applyCaseEffect(tiny, FINISH - 1, fixed(0.99)).to).toBe(FINISH);
  });
});

describe("resolveTurn", () => {
  it("avance du résultat de la roue", () => {
    const r = resolveTurn(B, { position: 9, turnsCounted: 3, finalScore: 5 }, fixed(0));
    expect(B.cases[12].type).toBe("dessin");
    expect(r).toMatchObject({ level: 3, steps: 3, from: 9, landed: 12, effect: null, to: 12, turnsCounted: 4, outcome: null });
  });
  it("applique l'effet de la case d'arrivée", () => {
    const i = B.cases.find((c) => c.type === "piege")!.index;
    const r = resolveTurn(B, { position: i - 1, turnsCounted: 0, finalScore: 0 }, fixed(0)); // roue niveau 0, part 0 = 1
    expect(r).toMatchObject({ landed: i, to: i - 3 });
    expect(r.effect?.type).toBe("piege");
  });
  it("chaque piège du plateau fait reculer de 3, sur une case réponse", () => {
    const traps = B.cases.filter((c) => c.type === "piege").map((c) => c.index);
    expect(traps.length).toBe(4);
    for (const i of traps) {
      const r = resolveTurn(B, { position: i - 1, turnsCounted: 0, finalScore: 0 }, fixed(0));
      expect(r).toMatchObject({ landed: i, to: i - 3, effect: { type: "piege", delta: -3 } });
      expect(isSpecial(B.cases[r.to].type)).toBe(false);
    }
  });
  it("une carte chance peut faire gagner", () => {
    const board: Board = { cases: B.cases.map((c) => ({ ...c })) };
    board.cases[FINISH - 2].type = "chance";
    const r = resolveTurn(board, { position: FINISH - 3, turnsCounted: 5, finalScore: 0 }, fixed(0.99)); // part 4 = 3 → arrivée directement
    expect(r.outcome).toBe("win");
    const r2 = resolveTurn(board, { position: FINISH - 3, turnsCounted: 5, finalScore: 0 }, fixed(0)); // +1 → chance, carte +1
    expect(r2).toMatchObject({ landed: FINISH - 2, to: FINISH - 1, outcome: null });
  });
  it("victoire en atteignant la case 63, sans la dépasser", () => {
    const r = resolveTurn(B, { position: FINISH - 2, turnsCounted: 14, finalScore: 5 }, fixed(0.999));
    expect(r).toMatchObject({ to: FINISH, outcome: "win" });
  });
  it("défaite à la fin du 24e tour", () => {
    const r = resolveTurn(B, { position: 20, turnsCounted: MAX_TURNS - 1, finalScore: 0 }, fixed(0));
    expect(r).toMatchObject({ turnsCounted: MAX_TURNS, outcome: "lose" });
  });
  it("24 tours", () => expect(MAX_TURNS).toBe(24));
  it("la victoire l'emporte au dernier tour", () => {
    const r = resolveTurn(B, { position: FINISH - 1, turnsCounted: MAX_TURNS - 1, finalScore: 0 }, fixed(0));
    expect(r.outcome).toBe("win");
  });
  it("une partie nulle perd au bout de 24 tours", () => {
    let pos = 0;
    let turns = 0;
    let outcome = null;
    while (!outcome) {
      const r = resolveTurn(B, { position: pos, turnsCounted: turns, finalScore: 0 }, fixed(0));
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

describe("pions", () => {
  it("liste fermée", () => {
    expect(isValidPawn("oie")).toBe(true);
    expect(isValidPawn("renard")).toBe(true);
    expect(isValidPawn("🦊")).toBe(false);
    expect(isValidPawn(3)).toBe(false);
  });
});

describe("codes de salle", () => {
  it("4 lettres majuscules", () => {
    for (let i = 0; i < 50; i++) expect(generateRoomCode()).toMatch(/^[A-Z]{4}$/);
  });
  it("normalisation", () => expect(normalizeRoomCode(" ab-cd9e ")).toBe("ABCD"));
});

describe("jokers", () => {
  const q = Q.find((x) => x.media === "mot")!;
  it("trois jokers au départ", () => {
    expect(INITIAL_JOKERS).toEqual(["mot_cle", "theme", "choix"]);
    expect(isJoker("theme")).toBe(true);
    expect(isJoker("bouclier")).toBe(false);
  });
  it("inventaire : jokers connus seulement, sans doublon", () => {
    expect(parseInventory(["choix", "x", "mot_cle", "choix"])).toEqual(["mot_cle", "choix"]);
    expect(parseInventory(null)).toEqual([]);
  });
  it("trois propositions dont la vraie, du même média, toutes différentes", () => {
    for (let k = 0; k < 20; k++) {
      const c = buildChoices(q, Q, fixed(k / 20));
      expect(c).toHaveLength(CHOICE_COUNT);
      expect(c).toContain(q.text);
      expect(new Set(c).size).toBe(CHOICE_COUNT);
      for (const t of c) expect(Q.find((x) => x.text === t && x.media === "mot")).toBeTruthy();
    }
  });
  it("les leurres viennent d'un autre thème quand c'est possible", () => {
    const c = buildChoices(q, Q, Math.random).filter((t) => t !== q.text);
    for (const t of c) expect(Q.find((x) => x.text === t)!.topic).not.toBe(q.topic);
  });
  it("la bonne réponse n'est pas toujours à la même place", () => {
    const places = new Set<number>();
    for (let k = 0; k < 30; k++) places.add(buildChoices(q, Q).indexOf(q.text));
    expect(places.size).toBeGreaterThan(1);
  });
  it("note du choix : 5 ou 0", () => {
    expect(choiceScore("a", "a")).toBe(5);
    expect(choiceScore("b", "a")).toBe(0);
  });
  it("index de choix valide", () => {
    expect(isValidChoice(0, ["a", "b", "c"])).toBe(true);
    expect(isValidChoice(3, ["a", "b", "c"])).toBe(false);
    expect(isValidChoice("1", ["a", "b", "c"])).toBe(false);
  });
});
