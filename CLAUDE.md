Lis SPEC.md avant toute modification. N'implémente que l'étape demandée. Ne casse pas les étapes précédentes. Toute règle de jeu va dans supabase/functions/_shared/rules.ts avec des tests. Le client n'écrit jamais directement en base. À la fin de chaque étape, liste ce que je dois configurer à la main et comment tester avec deux onglets.

## Repères techniques

- MVP (étapes 0 à 6) puis V2 faites : 7 médias, cases chance/malchance/piège/tremplin, plateau en spirale, pion commun, juge avec bonus d'originalité. Voir « Évolutions V2 » à la fin de SPEC.md. Les bonus partagés et l'ajustement de difficulté sont abandonnés.
- V3 faite : style « carnet de correspondance » (skill `style-carnet-correspondance`, à suivre pour toute interface), plateau carré de 63 cases en spirale, 24 tours, pions dessinés (`Pawn.tsx`), icônes au trait (`Icon.tsx`), juge mouton. Voir « Évolutions V3 » dans SPEC.md.
- V4 faite : timbres repositionnés (aucun effet n'atterrit sur un timbre, vérifié par `validateBoard`), plateau masqué pendant la manche (bouton « Plateau »), infobulles au lieu de la légende, 3 jokers communs (`use-joker`, champs `keyword` / `topic` des questions), quitter (`leave-room`) et recommencer par l'hôte (`reset-game`). Voir « Évolutions V4 » dans SPEC.md.
- Game juice : sons et vibrations dans `src/lib/juice.ts` (`sfx.*`, `buzz`, `useSound`), effets visuels dans `src/components/Juice.tsx` (`StampIn`, `PaperConfetti`, `HeartBurst`, `Sparkles`, `useShake`), à réutiliser pour tout nouvel effet. Emojis du sélecteur : `src/components/emojis.ts` (testé par `emojis.test.ts`).
- Vérifier toute modification d'interface avec la page d'aperçu : `npm run dev` puis `/?apercu=<écran>` (liste sur `/?apercu=`), données fictives dans `src/dev/Preview.tsx`, sans Supabase et absente du build. Chromium est installé (`/usr/bin/chromium-browser`) : on peut capturer chaque écran en 390 px et 1280 px avec `playwright-core` pour vérifier chevauchements et débordements.
- Audio : réglages `useAudioSettings()` (musique / bruitages, volume), musique générative `music` dans `src/lib/juice.ts`, menu `SoundMenu.tsx`.
- V5 faite : catégories de questions (Mignon, Drôle, Spicy niveaux 1 et 2, Profond). Banque dans `content/questions.json` (`generique` + `categories`, chaque question de catégorie liste ses `medias`), catégorie des cases dans `board.json`, tirage `drawRoundQuestion` dans `rules.ts`, réglage hôte `set-categories`. Voir « Évolutions V5 » dans SPEC.md.
- `content/*.json` est la source ; `npm run sync-content` les copie dans `supabase/functions/_shared/content/` (les Edge Functions sont déployées sans le reste du dépôt). Toujours lancer après une modification du contenu.
- Le front importe les règles via l'alias `@rules` et le plateau via `@board`. Il ne doit jamais importer `questions.json`.
- Toute écriture passe par la fonction SQL `apply_game_update` (une transaction, verrou optimiste sur `game_state.version` → 409 si l'état a changé).
- Une action refusée pour conflit de version (`ConflictError`) est rejouée automatiquement par `handle` (deux clics simultanés).
- Tests : `npm test` (règles), `npm run typecheck` (front), `npx deno check --node-modules-dir=none supabase/functions/*/index.ts` (Edge Functions).
- Les écarts volontaires à SPEC.md sont listés dans README.md, section « Écarts à la spec ».
