import { describe, expect, it } from "vitest";
import { isEmojiGrapheme, splitGraphemes, validateAnswer } from "../../supabase/functions/_shared/rules.ts";
import { EMOJI_GROUPS, normalizeSearch, searchEmojis } from "./emojis";

const ALL = EMOJI_GROUPS.flatMap((g) => g.list);

describe("sélecteur d'emojis", () => {
  it("environ 400 emojis", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(380);
  });
  it("chaque emoji est un seul graphème accepté par la règle du serveur", () => {
    for (const [e] of ALL) {
      expect(splitGraphemes(e), e).toHaveLength(1);
      expect(isEmojiGrapheme(e), e).toBe(true);
    }
  });
  it("trois emojis du sélecteur forment une réponse valide", () => {
    for (let i = 0; i + 2 < ALL.length; i += 3) {
      const answer = ALL[i][0] + ALL[i + 1][0] + ALL[i + 2][0];
      expect(validateAnswer("emojis", answer).ok, answer).toBe(true);
    }
  });
  it("aucun doublon", () => {
    const list = ALL.map(([e]) => e);
    expect(new Set(list).size).toBe(list.length);
  });
  it("chaque emoji a au moins un mot-clé", () => {
    for (const [e, k] of ALL) expect(k.trim().length, e).toBeGreaterThan(0);
  });
  it("recherche par début de mot, sans accents", () => {
    expect(searchEmojis("plage")).toContain("🏖️");
    expect(searchEmojis("chat")).toContain("🐱");
    expect(searchEmojis("fête")).toContain("🎉");
    expect(searchEmojis("coeur rouge")).toEqual(["❤️"]);
    expect(searchEmojis("   ")).toEqual([]);
    expect(normalizeSearch(" Été ")).toBe("ete");
  });
});
