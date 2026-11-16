// Juge LLM : note la proximité entre la question devinée et la vraie question,
// et peut accorder un bonus d'originalité à la réponse. Multimodal : il voit les dessins,
// les photos et les GIF (image fixe).
import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { isValidScore, type Media } from "./rules.ts";

const MODEL = "claude-haiku-5-5";
const OPENROUTER_MODEL = "anthropic/claude-haiku-5.5";

const SYSTEM_PROMPT = `Tu es l'arbitre bienveillant et drôle d'un jeu pour couples. Un joueur a répondu à une question secrète avec un média imposé (mot, nombre, emojis, dessin, photo, musique ou GIF) ; son partenaire a vu la réponse et a deviné la question.

1. Note de 0 à 5 à quel point la question devinée retrouve le sens de la vraie question. Sois indulgent : c'est l'idée qui compte, pas les mots.
5 = même idée, même si la formulation diffère ; 4 = même sujet et intention très proche ; 3 = bon sujet mais angle différent ; 2 = lien réel mais partiel ; 1 = lien lointain ; 0 = aucun rapport.
Ignore l'orthographe et la ponctuation. Si tu hésites entre deux notes, choisis la plus haute.

2. Originalité : juge la réponse du joueur (pas la devinette). Mets true seulement si elle surprend : détournement astucieux, jeu de mots, dessin ou photo avec une vraie idée, choix inattendu mais parlant. Une réponse évidente, banale ou attendue (pizza pour un plat, un morceau très connu, l'emoji le plus logique) n'est pas originale, même si elle est juste. En cas de doute, false. C'est un bonus rare : la plupart des réponses n'y ont pas droit.

Réponds uniquement avec un objet JSON : {"score": <entier 0 à 5>, "originalite": <true ou false>, "commentaire": "<une phrase drôle et bienveillante en français, 140 caractères max, qui tutoie les joueurs>"}`;

export interface JudgeInput {
  question: string;
  guess: string;
  media: Media;
  /** Réponse en texte (mot, nombre, emojis, « titre — artiste » pour la musique, titre du GIF). */
  answer: string | null;
  /** URL d'une image à montrer au juge (dessin, photo, image fixe du GIF). */
  imageUrl?: string | null;
}

export interface JudgeVerdict {
  score: number;
  originalite: boolean;
  commentaire: string;
}

const MEDIA_LABEL: Record<Media, string> = {
  mot: "un mot",
  nombre: "un nombre",
  emojis: "des emojis",
  dessin: "un dessin (image jointe)",
  photo: "une photo (image jointe)",
  musique: "un morceau de musique",
  gif: "un GIF (image fixe jointe)",
};

/** Coupe au dernier mot entier sous la limite, avec « … ». */
function truncate(s: string, max: number): string {
  const chars = [...s];
  if (chars.length <= max) return s;
  const cut = chars.slice(0, max - 1).join("");
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?-]+$/, "") + "…";
}

/** Vérifie et normalise la sortie du modèle. Renvoie null si elle est invalide. */
export function parseVerdict(text: string): JudgeVerdict | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (!isValidScore(obj.score)) return null;
    const commentaire = typeof obj.commentaire === "string" ? obj.commentaire.trim() : "";
    return { score: obj.score, originalite: obj.originalite === true, commentaire: truncate(commentaire, 140) };
  } catch {
    return null;
  }
}

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", enum: [0, 1, 2, 3, 4, 5] },
    originalite: { type: "boolean" },
    commentaire: { type: "string" },
  },
  required: ["score", "originalite", "commentaire"],
  additionalProperties: false,
};

function userText(input: JudgeInput): string {
  const lines = [
    `Vraie question : ${input.question}`,
    `Question devinée : ${input.guess}`,
    `Média imposé : ${MEDIA_LABEL[input.media]}`,
  ];
  if (input.answer) lines.push(`Réponse donnée : ${input.answer}`);
  return lines.join("\n");
}

type Caller = (input: JudgeInput) => Promise<JudgeVerdict | null>;

/** API Anthropic directe (secret ANTHROPIC_API_KEY). */
function anthropicCaller(apiKey: string): Caller {
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 25_000 });
  return async (input) => {
    const content: Anthropic.ContentBlockParam[] = [];
    if (input.imageUrl) content.push({ type: "image", source: { type: "url", url: input.imageUrl } });
    content.push({ type: "text", text: userText(input) });
    const response = await client.messages.create({
      model: MODEL,
      // La réflexion adaptative compte dans max_tokens ; l'effort "low" la garde courte.
      max_tokens: 1024,
      // Pas de `temperature` : claude-haiku-5-5 refuse toute valeur autre que celle par défaut (400).
      output_config: { effort: "low", format: { type: "json_schema", schema: VERDICT_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
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
    const content: unknown[] = [{ type: "text", text: userText(input) }];
    if (input.imageUrl) content.unshift({ type: "image_url", image_url: { url: input.imageUrl } });
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(25_000),
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
          { role: "user", content },
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
 * Au second essai, l'image est retirée (au cas où c'est elle qui pose problème).
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
      const verdict = await call(attempt === 1 ? input : { ...input, imageUrl: null });
      if (verdict) return verdict;
      console.warn(`Juge : réponse invalide (essai ${attempt})`);
    } catch (e) {
      console.warn(`Juge : échec de l'appel (essai ${attempt})`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}
