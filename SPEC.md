# Spec — Devine la question

## Vue d'ensemble

Devine la question est un jeu web coopératif à deux, en temps réel, pour couples à distance. Les deux joueurs font avancer un pion commun sur un plateau de 40 cases et doivent atteindre l'arrivée en 15 tours au maximum.

À chaque tour, un joueur reçoit une question secrète et y répond avec le média imposé par la case (un mot, un nombre, des emojis, un dessin, une photo). L'autre voit la réponse et devine la question. Un juge LLM note la proximité entre la question devinée et la vraie, les joueurs peuvent ajuster cette note, puis la note fixe une roue pondérée qui décide de combien de cases le pion avance.

**Principes non négociables pour Claude Code**

- Pas de compte : on rejoint une partie avec un code à 4 lettres. Chaque appareil reçoit une identité anonyme Supabase.
- Serveur autoritaire : le client ne modifie jamais l'état de la partie directement. Toute action passe par une Edge Function qui vérifie le joueur, la phase et le rôle.
- Toute la logique de règles (roue, déplacement, effets de cases, score) vit dans un module TypeScript pur, partagé et testé.
- Interface en français, pensée d'abord pour mobile.
- La clé de l'API Anthropic n'apparaît jamais dans le code du front.

**Périmètre**

| Version | Contenu |
| --- | --- |
| MVP | Salles, tour complet, juge LLM, coup de cœur, appel, plateau, roue pondérée, médias mot, nombre et emojis, écran de fin |
| V2 | Dessin et photo, cases spéciales, bonus partagés, ajustement de difficulté |
| Plus tard | Vocal, juge multimodal, questions générées par LLM, historique des parties |

## Boucle d'un tour

Un tour passe par sept phases, toujours dans le même ordre. Les rôles s'échangent à chaque tour : le répondant devient le devineur. Le média du tour est celui de la case où se trouve le pion (la case Départ impose un mot).

1. **answering** : le serveur tire une question non encore jouée dans le paquet du média. Seul le répondant la voit. Il envoie sa réponse. Le devineur voit « ton partenaire répond… ».
2. **guessing** : le devineur voit la réponse et écrit la question qu'il imagine (250 caractères max).
3. **judging** : le serveur appelle le juge LLM. Les deux écrans affichent une attente animée.
4. **reveal** : les deux voient la vraie question, la question devinée, la note du juge et son commentaire. Le devineur peut donner un coup de cœur. L'un ou l'autre peut faire appel, une fois par partie. Les deux cliquent sur « Continuer ».
5. **appeal** (seulement si appel) : chacun donne en secret une note de 0 à 5. La moyenne remplace la note du juge.
6. **spin** : le serveur calcule la note finale, choisit le niveau de roue et tire le résultat. Le client anime la roue jusqu'à ce résultat.
7. **moving** : le pion avance, l'effet de la case d'arrivée s'applique, puis le tour suivant commence.

La partie passe en **finished** dès que le pion atteint la case 40 (victoire) ou à la fin du 15e tour (défaite). Une phase **lobby** précède le premier tour.

| Phase | Qui agit | Action attendue | Transition |
| --- | --- | --- | --- |
| lobby | les deux | rejoindre, puis « Commencer » | answering quand 2 joueurs sont là |
| answering | répondant | submit-answer | guessing |
| guessing | devineur | submit-guess | judging |
| judging | serveur | appel au juge | reveal |
| reveal | les deux | cœur, appel, continuer | appeal ou spin |
| appeal | les deux | submit-appeal-score | spin quand les 2 notes sont là |
| spin | serveur | tirage de la roue | moving |
| moving | serveur | déplacement et effet | answering ou finished |

## Plateau, roue et équilibrage

Le plateau compte 41 cases (0 = Départ, 40 = Arrivée), définies dans un fichier `board.json` fixe. Environ 70 % sont des cases média et 30 % des cases spéciales, avec plus de pièges dans la seconde moitié. À l'écran, le plateau s'affiche en serpentin.

**Types de cases média**

| Média | Saisie | Contraintes | Version |
| --- | --- | --- | --- |
| Mot | champ texte | un seul mot, 30 caractères max, pas d'espace | MVP |
| Nombre | champ numérique | entier ou décimal | MVP |
| Emojis | sélecteur d'emojis | 1 à 3 emojis, rien d'autre | MVP |
| Dessin | canvas tactile | 60 secondes, export PNG | V2 |
| Photo | caméra ou galerie | compressée côté client, 1 Mo max | V2 |

Tant que dessin et photo ne sont pas prêts, leurs cases se comportent comme des cases mot.

**Cases spéciales (V2)**

Une case spéciale applique son effet à l'arrivée du pion, puis le tour suivant utilise le média de la case média la plus proche en arrière.

| Case | Effet |
| --- | --- |
| Piège | recule de 3 cases (annulé par un Bouclier) |
| Tremplin | avance de 2 cases, sans effet en chaîne |
| Coffre | ajoute un bonus tiré au hasard à l'inventaire |
| Tempête | la prochaine roue est plafonnée au niveau 0 |
| Double tour | le tour suivant ne compte pas dans la limite de 15 |

**Roue pondérée**

La note finale du tour (0 à 5) fixe un niveau de roue. Le serveur tire une part au hasard, de manière uniforme parmi les parts du niveau. Le client affiche la roue avec ces parts et l'anime jusqu'au résultat déjà tiré.

| Niveau | Note finale | Parts de la roue (cases) |
| --- | --- | --- |
| 0 | moins de 2 | 1, 1, 2, 2, 3 |
| 1 | 2 à moins de 3 | 1, 2, 2, 3, 3, 4 |
| 2 | 3 à moins de 4 | 2, 3, 3, 4, 4, 5 |
| 3 | 4 et plus | 3, 4, 4, 5, 5, 6 |

**Ajustement de difficulté (V2)**

Le rythme attendu est de 40 / 15, soit environ 2,7 cases par tour. Avant chaque tirage, le serveur calcule l'écart = position − 2,7 × tours joués.

- Écart de −4 ou moins : la roue monte d'un niveau (max 3) et la probabilité de tirer un bonus rare dans un Coffre double.
- Écart de +4 ou plus : la roue descend d'un niveau (min 0).
- Entre les deux : pas d'ajustement.

**Bonus partagés (V2)**

L'inventaire est commun et contient 3 bonus au maximum. L'un ou l'autre joueur peut les utiliser pendant la phase indiquée.

| Bonus | Quand | Effet |
| --- | --- | --- |
| Joker | answering | tire une autre question du même média |
| Indice | guessing | affiche le thème de la question au devineur |
| Bouclier | passif | annule le prochain Piège |
| Roue dorée | reveal | la prochaine roue est au niveau 3 |

## Scoring : juge LLM et notes humaines

La note finale d'un tour = note du juge (ou de l'appel) + 1 si coup de cœur, plafonnée à 5.

**Juge LLM**

- Modèle : `claude-haiku-5-5` via l'API Anthropic, température 0, 200 tokens max.
- Appelé uniquement depuis l'Edge Function `submit-guess`. La clé est un secret Supabase.
- Entrées : vraie question, question devinée, type de média, réponse (en texte pour mot, nombre et emojis ; « un dessin » ou « une photo » sinon).
- Sortie attendue : JSON `{"score": 0-5, "commentaire": "..."}`, commentaire de 140 caractères max.
- Validation : score entier entre 0 et 5. Si la réponse est invalide ou si l'appel échoue, on réessaie une fois. Au second échec, on passe en notation manuelle (même mécanique que l'appel).

Barème : 5 = même question, même sens. 4 = même sujet, nuance proche. 3 = bon thème, mauvaise question. 2 = vaguement lié. 1 = lointain. 0 = aucun rapport.

Prompt système à utiliser tel quel :

```text
Tu es l'arbitre bienveillant et drôle d'un jeu pour couples. Un joueur a répondu à une question secrète avec un média imposé ; son partenaire a vu la réponse et a deviné la question.
Évalue uniquement à quel point la question devinée a le même sens que la vraie question, selon ce barème :
5 = même question, même sens ; 4 = même sujet, nuance proche ; 3 = bon thème mais pas la bonne question ; 2 = vaguement lié ; 1 = lointain ; 0 = aucun rapport.
Ignore l'orthographe, la ponctuation et les différences de formulation. Ne juge pas la qualité de la réponse.
Réponds uniquement avec un objet JSON : {"score": <entier 0 à 5>, "commentaire": "<une phrase drôle et bienveillante en français, 140 caractères max, qui tutoie les joueurs>"}
```

**Coup de cœur**

Pendant la phase reveal, le devineur peut donner un cœur à la réponse s'il l'a trouvée drôle ou créative. Cela ajoute +1 à la note finale. Le cœur est compté dans le bilan de fin.

**Appel**

- Une fois par partie, l'un ou l'autre joueur peut contester le verdict pendant reveal.
- Phase appeal : chacun donne en secret une note de 0 à 5. Les notes sont révélées ensemble.
- La moyenne arrondie au demi-point remplace la note du juge. Le cœur s'ajoute ensuite.
- Le bouton d'appel disparaît une fois utilisé.

## Architecture technique

Vercel héberge uniquement le front statique. Tout ce qui est données, temps réel, fichiers et logique serveur est chez Supabase. Le front lit l'état de la partie et s'abonne à ses changements, mais n'écrit que via les Edge Functions.

*[Schéma : architecture · Vercel, Supabase, juge LLM]*

Vercel ne sert l'appli qu'au chargement. Ensuite, chaque action passe par une Edge Function, qui écrit en base ; Realtime diffuse le nouvel état aux deux joueurs.

| Brique | Choix | Rôle |
| --- | --- | --- |
| Front | React 19 + Vite + TypeScript + Tailwind, Framer Motion pour les animations | interface, animations, saisie des médias |
| Hébergement du front | Vercel, déploiement automatique depuis GitHub | sert les fichiers construits via son CDN |
| Base de données | Supabase Postgres avec RLS | état des parties, tours, questions secrètes |
| Temps réel | Supabase Realtime (Postgres Changes + Presence) | pousse chaque changement d'état aux deux écrans |
| Fichiers | Supabase Storage, bucket privé `answers` | dessins et photos, lus par URL signée |
| Logique serveur | Supabase Edge Functions (Deno) | une fonction par action de jeu, appel au juge |
| Identité | Supabase Auth anonyme (`signInAnonymously`) | un identifiant stable par appareil, sans compte |
| Juge | API Anthropic, `claude-haiku-5-5` | note la question devinée |

**Variables d'environnement**

| Où | Variable | Visible par le navigateur |
| --- | --- | --- |
| Vercel | `VITE_SUPABASE_URL` | oui |
| Vercel | `VITE_SUPABASE_ANON_KEY` | oui, protégée par la RLS |
| Secrets Supabase | `ANTHROPIC_API_KEY` | non |
| Secrets Supabase | `SUPABASE_SERVICE_ROLE_KEY` (fournie automatiquement aux fonctions) | non |

**Organisation du dépôt**

```text
/src                     front React
  /screens               un fichier par écran
  /components            roue, plateau, éditeurs de médias
  /lib/supabase.ts       client Supabase
  /lib/actions.ts        appels aux Edge Functions
/supabase
  /migrations            schéma SQL et politiques RLS
  /functions/_shared     rules.ts (règles pures), judge.ts, auth.ts
  /functions/<action>    une Edge Function par action
/content
  questions.json
  board.json
SPEC.md                  ce document
```

## Modèle de données

Cinq tables suffisent. La question secrète vit dans une table à part, pour que la RLS la cache au devineur tant que la phase reveal n'est pas atteinte.

| Table | Champs principaux |
| --- | --- |
| `rooms` | `id` uuid, `code` text unique (4 lettres majuscules), `status` (lobby, playing, finished), `created_at` |
| `players` | `id`, `room_id`, `user_id` (auth anonyme), `name`, `seat` (0 ou 1), unique (`room_id`, `seat`) |
| `game_state` | `room_id` (clé), `phase`, `turn_number`, `turns_counted`, `answerer_seat`, `position`, `inventory` jsonb, `appeal_used`, `next_wheel_override`, `shield_active`, `current_round_id`, `outcome` (win, lose, null), `updated_at` |
| `rounds` | `id`, `room_id`, `turn_number`, `case_index`, `media`, `question_id`, `answer_text`, `answer_media_path`, `guess_text`, `llm_score`, `llm_comment`, `heart`, `appeal_scores` jsonb, `final_score`, `wheel_level`, `wheel_result`, `revealed` bool, `continue_votes` jsonb |
| `round_secrets` | `round_id` (clé), `question_text`, `theme`, `answerer_user_id` |

**Règles RLS**

- Lecture de `rooms`, `players`, `game_state` et `rounds` : uniquement par les joueurs de la salle (`auth.uid()` présent dans `players` pour ce `room_id`).
- Lecture de `round_secrets` : si `auth.uid() = answerer_user_id`, ou si le tour lié a `revealed = true`.
- Aucune insertion ni modification depuis le client : seules les Edge Functions écrivent, avec la clé service.
- Bucket `answers` privé : chemin `room_id/round_id.png`, lecture par URL signée valable 1 heure, générée par une fonction.

`game_state` et `rounds` sont ajoutées à la publication Realtime. `round_secrets` ne l'est pas : le client la relit au besoin.

## Temps réel et logique serveur

L'état de la partie est entièrement en base : un rafraîchissement de page ou une coupure réseau ne perd rien. Le client recharge l'état, puis se réabonne.

**Côté client**

- Au chargement : `signInAnonymously` si aucune session n'existe (la session reste dans le navigateur).
- Abonnement Postgres Changes sur `game_state` et `rounds`, filtré par `room_id`.
- Canal Presence `room:<code>` pour afficher si le partenaire est connecté.
- L'interface est une fonction de `game_state.phase` et du siège du joueur : chaque phase a son écran pour le répondant et pour le devineur.
- La roue et le déplacement sont seulement des animations : le résultat vient toujours du serveur.

**Edge Functions (une par action)**

| Fonction | Phase requise | Effet |
| --- | --- | --- |
| `create-room` | aucune | crée la salle, le code, le joueur siège 0 et le `game_state` |
| `join-room` | lobby | ajoute le joueur siège 1, refuse une troisième personne |
| `start-game` | lobby | crée le premier tour, tire la question, passe en answering |
| `submit-answer` | answering | vérifie le rôle et le format du média, enregistre, passe en guessing |
| `upload-url` | answering | renvoie une URL d'upload signée pour dessin ou photo |
| `submit-guess` | guessing | enregistre, passe en judging, appelle le juge, passe en reveal |
| `react` | reveal | coup de cœur (devineur seulement, une fois) |
| `appeal` | reveal | passe en appeal si `appeal_used` est faux |
| `submit-appeal-score` | appeal | enregistre la note, passe en spin quand les deux sont là |
| `continue` | reveal | enregistre le vote, lance spin quand les deux ont cliqué |
| `use-bonus` | selon le bonus | applique le bonus et le retire de l'inventaire |
| `rematch` | finished | remet la partie à zéro dans la même salle |

**Règles communes à toutes les fonctions**

1. Lire le JWT et retrouver le joueur et son siège. Refuser s'il n'est pas dans la salle.
2. Refuser si la phase ou le rôle ne correspond pas (réponse 409). Cela rend un double clic sans effet.
3. Faire les écritures dans une seule transaction (fonction SQL appelée par `rpc`) pour qu'aucun écran ne voie un état à moitié écrit.
4. Calculer la roue, le déplacement et les effets de cases avec `_shared/rules.ts`, sans appel réseau, pour pouvoir les tester.

Les phases spin et moving s'enchaînent dans la même fonction que celle qui les déclenche. Le client attend environ 4 secondes d'animation avant d'afficher l'écran suivant, mais l'état est déjà à jour en base.

## Écrans

Huit écrans, tous utilisables sur un téléphone en portrait. Le plateau reste visible en petit en haut des écrans de jeu (position, tour X/15, inventaire).

| Écran | Répondant | Devineur |
| --- | --- | --- |
| Accueil | pseudo, « Créer une partie », « Rejoindre » avec un code | identique |
| Salle d'attente | code en grand, bouton copier le lien, état 1/2 ou 2/2, « Commencer » | identique |
| Plateau | serpentin de 41 cases, pion, couleur par type de case, compteur de tours | identique |
| Réponse | question secrète, éditeur du média, chrono pour le dessin | « Ton partenaire répond… » avec le type de média |
| Devinette | « Ton partenaire devine… » | la réponse en grand, champ « Quelle était la question ? » |
| Révélation | vraie question et question devinée côte à côte, note du juge animée (étoiles), commentaire, bouton appel, Continuer | idem, plus le bouton cœur |
| Roue | roue animée avec les parts du niveau, résultat, pion qui avance, effet de case | identique |
| Fin | victoire ou défaite, complicité en %, 3 meilleurs moments, nombre de cœurs, « Rejouer » | identique |

La complicité affichée à la fin = moyenne des notes finales des tours ÷ 5 × 100, arrondie. Les meilleurs moments sont les 3 tours avec la note finale la plus haute, avec leur réponse et les deux questions.

## Contenu des questions

Il faut viser 25 questions par média pour le MVP, soit 75 pour mot, nombre et emojis. Une bonne question se répond vraiment avec le média imposé, et la réponse laisse une chance de retrouver la question.

Format de `content/questions.json` :

```json
[
  { "id": "mot-001", "media": "mot", "theme": "souvenirs", "text": "Le premier mot qui te vient quand tu penses à notre premier rendez-vous" },
  { "id": "nombre-001", "media": "nombre", "theme": "futur", "text": "Combien d'enfants aimerais-tu avoir ?" }
]
```

Thèmes possibles : `leger`, `souvenirs`, `futur`, `profond`. Une question ne sort qu'une fois par partie.

| Média | Exemples |
| --- | --- |
| Mot | Ton humeur du lundi matin en un mot · Ce que tu emporterais sur une île déserte · Le premier mot qui te vient quand tu penses à notre premier rendez-vous |
| Nombre | Combien d'enfants aimerais-tu avoir ? · Combien d'heures de sommeil il te faut pour être de bonne humeur ? · Combien de jours tu tiendrais sans me parler ? |
| Emojis | Ton week-end idéal en 3 emojis · Ton plat préféré · Notre prochain voyage |
| Dessin | Ton petit-déjeuner idéal · Moi tel que tu me vois le matin · La maison où tu aimerais vivre |
| Photo | L'objet le plus inutile de ta chambre · Ce que tu vois par ta fenêtre · Un objet qui te fait penser à moi |

## Plan de construction avec Claude Code

On construit en 9 étapes, une session Claude Code par étape. L'étape 5 termine le MVP jouable. Avant de commencer : exporter ce document en Markdown, le placer à la racine du dépôt sous le nom `SPEC.md`, et donner à Claude Code cette consigne permanente (dans `CLAUDE.md`) :

```text
Lis SPEC.md avant toute modification. N'implémente que l'étape demandée. Ne casse pas les étapes précédentes. Toute règle de jeu va dans supabase/functions/_shared/rules.ts avec des tests. Le client n'écrit jamais directement en base. À la fin de chaque étape, liste ce que je dois configurer à la main et comment tester avec deux onglets.
```

| Étape | Prompt pour Claude Code | C'est validé quand |
| --- | --- | --- |
| 0. Socle | « Initialise le projet selon la section Architecture : Vite, React, TypeScript, Tailwind, client Supabase, dossier supabase/. Guide-moi pour créer le projet Supabase et déployer sur Vercel. » | une page « Bonjour » est en ligne sur une URL Vercel |
| 1. Salles | « Implémente l'auth anonyme, les tables rooms, players et game_state avec RLS, les fonctions create-room et join-room, l'accueil et la salle d'attente avec Presence. » | deux onglets (dont un en navigation privée) se voient en 2/2 ; un troisième est refusé |
| 2. Tour en mode mot | « Implémente rounds, round_secrets, questions.json (25 questions mot), start-game, submit-answer, submit-guess sans juge (note manuelle), l'écran de réponse, de devinette et de révélation. » | le devineur ne voit jamais la question avant la révélation, même dans l'onglet Réseau du navigateur |
| 3. Juge LLM | « Ajoute le juge dans _shared/judge.ts selon la section Scoring, avec réessai et repli sur notation manuelle. » | 10 parties test donnent des notes cohérentes ; une clé invalide déclenche le repli |
| 4. Cœur et appel | « Ajoute react, appeal, submit-appeal-score et continue, et le calcul de la note finale. » | la note finale suit la formule ; l'appel ne marche qu'une fois |
| 5. Plateau et roue | « Ajoute board.json, le plateau en serpentin, la roue pondérée, le déplacement, la fin de partie et l'écran de fin. Teste rules.ts. » | une partie complète se joue jusqu'à la victoire ou au 15e tour ; les tests passent |
| 6. Nombre et emojis | « Ajoute les médias nombre et emojis avec leurs éditeurs, validations et 25 questions chacun. » | une réponse invalide est refusée côté client et côté serveur |
| 7. Dessin et photo | « Ajoute le bucket answers, upload-url, l'éditeur de dessin (60 s) et la photo compressée. » | un dessin fait sur téléphone s'affiche chez l'autre en moins de 3 secondes |
| 8. Cases et bonus | « Ajoute les cases spéciales, l'inventaire, use-bonus et l'ajustement de difficulté. » | tests unitaires pour chaque effet et chaque seuil d'écart |

**Points de vigilance**

- Tester chaque étape avec deux navigateurs ou un onglet en navigation privée : deux onglets normaux partagent la même session anonyme.
- Vérifier la RLS en lisant `round_secrets` depuis la console du navigateur du devineur : la requête doit revenir vide.
- Ne jamais coller la clé Anthropic dans un fichier du front ni dans un fichier commité.

