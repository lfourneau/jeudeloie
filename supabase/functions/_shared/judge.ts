// Juge LLM : note la proximité entre la question devinée et la vraie question.
import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { isValidScore, type Media } from "./rules.ts";

const MODEL = "claude-haiku-5-5";
const OPENROUTER_MODEL = "anthropic/claude-haiku-5.5";

const SYSTEM_PROMPT = `Tu es l'arbitre bienveillant et drôle d'un jeu pour couples. Un joueur a répondu à une question secrète avec un média imposé ; son partenaire a vu la réponse et a deviné la question.
Évalue uniquement à quel point la question devinée a le même sens que la vraie question, selon ce barème :
5 = même question, même sens ; 4 = même sujet, nuance proche ; 3 = bon thème mais pas la bonne question ; 2 = vaguement lié ; 1 = lointain ; 0 = aucun rapport.
Ignore l'orthographe, la ponctuation et les différences de formulation. Ne juge pas la qualité de la réponse.
Réponds uniquement avec un objet JSON : {"score": <entier 0 à 5>, "commentaire": "<une phrase drôle et bienveillante en français, 140 caractères max, qui tutoie les joueurs>"}`;

export interface JudgeInput {
  question: string;
  guess: string;
  media: Media;
  answer: string | null;
}

export interface JudgeVerdict {
  score: number;
  commentaire: string;
}

function describeAnswer(media: Media, answer: string | null): string {
  if (media === "dessin") return "un dessin";
  if (media === "photo") return "une photo";
  return answer ?? "";
}

/** Vérifie et normalise la sortie du modèle. Renvoie null si elle est invalide. */
export function parseVerdict(text: string): JudgeVerdict | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (!isValidScore(obj.score)) return null;
    const commentaire = typeof obj.commentaire === "string" ? obj.commentaire.trim() : "";
    return { score: obj.score, commentaire: [...commentaire].slice(0, 140).join("") };
  } catch {
    return null;
  }
}

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", enum: [0, 1, 2, 3, 4, 5] },
    commentaire: { type: "string" },
  },
  required: ["score", "commentaire"],
  additionalProperties: false,
};

function userMessage(input: JudgeInput): string {
  return [
    `Vraie question : ${input.question}`,
    `Question devinée : ${input.guess}`,
    `Média imposé : ${input.media}`,
    `Réponse donnée : ${describeAnswer(input.media, input.answer)}`,
  ].join("\n");
}

type Caller = (input: JudgeInput) => Promise<JudgeVerdict | null>;

/** API Anthropic directe (secret ANTHROPIC_API_KEY). */
function anthropicCaller(apiKey: string): Caller {
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 20_000 });
  return async (input) => {
    const response = await client.messages.create({
      model: MODEL,
      // La spec demande 200 tokens. On garde une marge car la réflexion adaptative de ce modèle
      // compte dans max_tokens ; l'effort "low" la garde très courte.
      max_tokens: 1024,
      // Pas de `temperature` : claude-haiku-5-5 refuse toute valeur autre que celle par défaut (400).
      output_config: { effort: "low", format: { type: "json_schema", schema: VERDICT_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage(input) }],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    return parseVerdict(text);
  };
}

/** Même modèle via OpenRouter (secret OPENROUTER_API_KEY), API compatible chat completions. */
function openRouterCaller(apiKey: string): Caller {
  const model = Deno.env.get("OPENROUTER_MODEL") ?? OPENROUTER_MODEL;
  return async (input) => {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Devine la question",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        reasoning: { effort: "low" },
        response_format: {
          type: "json_schema",
          json_schema: { name: "verdict", strict: true, schema: VERDICT_SCHEMA },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage(input) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? parseVerdict(text) : null;
  };
}

/**
 * Appelle le juge, réessaie une fois si la réponse est invalide ou si l'appel échoue.
 * Renvoie null au second échec : la partie passe alors en notation manuelle.
 * Fournisseur : ANTHROPIC_API_KEY si présente, sinon OPENROUTER_API_KEY.
 */
export async function judge(input: JudgeInput): Promise<JudgeVerdict | null> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const call = anthropicKey ? anthropicCaller(anthropicKey) : openRouterKey ? openRouterCaller(openRouterKey) : null;
  if (!call) {
    console.error("Aucune clé de juge (ANTHROPIC_API_KEY ou OPENROUTER_API_KEY) : notation manuelle");
    return null;
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const verdict = await call(input);
      if (verdict) return verdict;
      console.warn(`Juge : réponse invalide (essai ${attempt})`);
    } catch (e) {
      console.warn(`Juge : échec de l'appel (essai ${attempt})`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}
