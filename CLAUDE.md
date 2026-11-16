Lis SPEC.md avant toute modification. N'implémente que l'étape demandée. Ne casse pas les étapes précédentes. Toute règle de jeu va dans supabase/functions/_shared/rules.ts avec des tests. Le client n'écrit jamais directement en base. À la fin de chaque étape, liste ce que je dois configurer à la main et comment tester avec deux onglets.

## Repères techniques

- Étapes 0 à 6 de SPEC.md faites (MVP). Restent : 7 (dessin et photo), 8 (cases spéciales, bonus, ajustement).
- `content/*.json` est la source ; `npm run sync-content` les copie dans `supabase/functions/_shared/content/` (les Edge Functions sont déployées sans le reste du dépôt). Toujours lancer après une modification du contenu.
- Le front importe les règles via l'alias `@rules` et le plateau via `@board`. Il ne doit jamais importer `questions.json`.
- Toute écriture passe par la fonction SQL `apply_game_update` (une transaction, verrou optimiste sur `game_state.version` → 409 si l'état a changé).
- Tests : `npm test` (règles), `npm run typecheck` (front), `npx deno check --node-modules-dir=none supabase/functions/*/index.ts` (Edge Functions).
- Les écarts volontaires à SPEC.md sont listés dans README.md, section « Écarts à la spec ».
