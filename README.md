# Devine la question

Jeu web coopératif à deux, en temps réel, pour couples à distance. La spec complète est dans [SPEC.md](SPEC.md).

Fonctionnalités : salles avec code à 4 lettres, pion commun au choix (dessins à l'encre), plateau carré de 63 cases parcouru en spirale (affiché entre deux manches ou à la demande, infobulles au survol), trois jokers communs (mot-clé, thème, trois propositions), quitter / recommencer, catégories de questions (Mignon, Drôle, Spicy à deux niveaux, Profond) choisies par l'hôte, style « carnet de correspondance », 7 médias (mot, nombre, emojis, dessin, photo, musique, GIF), juge LLM multimodal avec bonus d'originalité et repli manuel, coup de cœur, appel, roue pondérée, cases chance / malchance / piège / tremplin, écran de fin et revanche.

## Lancer le projet

### 1. Supabase (une fois)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins** : active-le.
3. La CLI est installée avec le projet (`npx supabase`) :

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-du-projet>
   npx supabase db push --remote                              # tables, RLS, Realtime, fonctions SQL (sans --remote : base locale Docker)
   npx supabase secrets set OPENROUTER_API_KEY=sk-or-...      # clé du juge (ou ANTHROPIC_API_KEY=sk-ant-...)
   npx supabase secrets set GIPHY_API_KEY=...                 # clé gratuite sur developers.giphy.com (cases GIF)
   npm run deploy:functions                                   # copie le contenu puis déploie les 17 fonctions (répondre « y » à la confirmation)
   ```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement aux fonctions.

**Juge** : `ANTHROPIC_API_KEY` est utilisée si elle existe, sinon `OPENROUTER_API_KEY` (modèle `anthropic/claude-haiku-5.5`, modifiable avec le secret `OPENROUTER_MODEL`). Sans aucune des deux, chaque tour passe en notation manuelle.

**GIF** : sans `GIPHY_API_KEY`, une case GIF se joue en emojis. **Musique** : Deezer, sans clé.

### 2. Front en local

```bash
npm install
cp .env.example .env.local   # mets l'URL et la clé anon (Project Settings → API)
npm run dev
```

### 3. Vercel

Importe le dépôt GitHub dans Vercel (preset Vite détecté), ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement, déploie. `vercel.json` renvoie toutes les routes vers `index.html`.

## Tester à deux

Ouvre deux navigateurs, ou un onglet normal + un onglet en navigation privée (deux onglets normaux partagent la même session anonyme).

1. Onglet A : pseudo → « Créer une partie » → « Copier le lien ».
2. Onglet B : colle le lien (ou tape le code) → « Rejoindre ». Les deux voient 2/2. Un troisième navigateur est refusé.
3. « Commencer » : A voit la question secrète, B voit « … répond ». Réponds, devine, regarde le verdict, donne un cœur, fais appel une fois, « Continuer » des deux côtés, puis la roue et le pion.
4. **RLS** : dans l'onglet Réseau du devineur, filtre `round_secrets` → la réponse est `[]` jusqu'à la révélation.
5. **Repli du juge** : `npx supabase secrets set OPENROUTER_API_KEY=invalide` → le tour passe en notation manuelle (chacun note de 0 à 5).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | front en local |
| `npm test` | tests de `rules.ts` (Vitest) |
| `npm run typecheck` | vérification TypeScript du front |
| `npm run build` | build de production |
| `npm run sync-content` | copie `content/*.json` vers les Edge Functions |
| `npm run deploy:functions` | sync + `supabase functions deploy` |

## Architecture

```text
src/screens/            un fichier par écran (Home, Lobby, Answer, Guess, Judging, Reveal, Appeal, WheelScreen, End)
src/components/         plateau carré (infobulles), barre d'état, menu de partie, jokers, icônes et pions dessinés, roue, étoiles, éditeurs
src/lib/useGame.ts      lecture de l'état + abonnement Realtime + Presence
src/lib/actions.ts      appels aux Edge Functions (seul chemin d'écriture)
supabase/migrations/    schéma, RLS, publication Realtime, fonctions SQL transactionnelles
supabase/functions/_shared/rules.ts   règles pures, partagées front/serveur, testées
supabase/functions/_shared/judge.ts   juge LLM (claude-haiku-5-5), réessai, repli manuel
supabase/functions/<action>/          une Edge Function par action
content/                questions.json (section générique : 175 questions par média ; catégories : 501 questions), board.json (64 cases : 0 à 63, catégorie des cases réponse)
```

## Écarts à la spec

| Point | Spec | Choix | Pourquoi |
| --- | --- | --- | --- |
| Juge : température | 0 | non envoyée | `claude-haiku-5-5` refuse toute température autre que celle par défaut (erreur 400). Sortie JSON imposée par schéma (`output_config.format`) et effort `low` à la place. |
| Juge : fournisseur | API Anthropic | Anthropic ou OpenRouter | même modèle Claude Haiku 5.5, au choix selon la clé disponible. |
| Juge : tokens max | 200 | 1024 | La réflexion adaptative du modèle compte dans `max_tokens` ; 200 risquait de couper la réponse. |
| `question_id` | dans `rounds` | dans `round_secrets` | `rounds` est lisible par le devineur ; avec le dépôt public, l'id suffirait à retrouver la question. |
| Colonnes ajoutées | — | `game_state.version`, `rounds.answerer_seat`, `judge_failed`, `appeal_manual`, `wheel_index`, `position_after` | verrou optimiste, animation exacte de la roue et du pion, notation manuelle. |
| Realtime | `game_state`, `rounds` | + `players` | la salle d'attente passe à 2/2 sans rechargement. |
| Coup de cœur | pendant reveal | reveal ou appeal | sinon un appel lancé avant le cœur l'empêcherait. |
| Revanche | remise à zéro | retour à la salle d'attente | les deux cliquent « Commencer » quand ils sont prêts. |
| Juge bloqué | — | bouton « Relancer le juge » après 50 s | si la fonction est coupée pendant `judging`, la partie ne reste pas figée. |
| Cases spéciales | piège, tremplin, coffre, tempête, double tour + bonus | chance, malchance, piège, tremplin | choix V2 : uniquement des effets de déplacement. |
| Juge | barème strict, texte seul | barème indulgent, bonus d'originalité, voit les images | demande V2. |
| Clics simultanés | 409 | action rejouée automatiquement | deux « Continuer » au même moment ne bloquent plus le tour. |
| Plateau | 41 cases, 15 tours, serpentin | 63 cases (grille 8 × 8 en spirale), 24 tours | demande V3 : jeu de l'oie traditionnel ; tours augmentés pour garder la même difficulté. |
| Pion | emoji | dessin à l'encre | le style carnet exclut les emojis de l'interface. |
| Bonus partagés | Joker, Indice, Bouclier, Roue dorée | Mot-clé, Thème, Trois propositions | demande V4 : trois aides pour le devineur, une de chaque par partie. |
| Légende | sous le plateau | infobulle au survol (ordinateur) | demande V4 : plus de place pour le jeu. |
| Plateau | toujours visible | masqué pendant la manche, affiché entre deux manches ou à la demande | demande V4. |
| Timbres | ~30 %, pas de contrainte d'arrivée | aucun effet ne peut atterrir sur un timbre | sans effet en chaîne, atterrir sur un piège ne faisait rien : le joueur croyait à un bug. |
| Catégories | thèmes `leger`, `souvenirs`, `futur`, `profond` | 4 catégories avec couleur, dont Spicy à 2 niveaux, et les questions d'origine gardées en section générique de secours | demande V5 ; la case garde son média, la catégorie choisit le sujet. |
| Quitter | — | « Quitter la partie » pour tous, « Recommencer la partie » pour l'hôte | demande V4. |

**Limite connue** : pendant un appel, la note déjà donnée par l'un est lisible dans l'onglet Réseau de l'autre (elle n'est pas affichée à l'écran). À corriger en V2 en la stockant hors de `rounds`.
