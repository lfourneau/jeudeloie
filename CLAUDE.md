Lis SPEC.md avant toute modification. N'implémente que l'étape demandée. Ne casse pas les étapes précédentes. Toute règle de jeu va dans supabase/functions/_shared/rules.ts avec des tests. Le client n'écrit jamais directement en base. À la fin de chaque étape, liste ce que je dois configurer à la main et comment tester avec deux onglets.

## Repères techniques

- MVP (étapes 0 à 6) puis V2 faites : 7 médias, cases chance/malchance/piège/tremplin, plateau en spirale, pion commun, juge avec bonus d'originalité. Voir « Évolutions V2 » à la fin de SPEC.md. Les bonus partagés et l'ajustement de difficulté sont abandonnés.
- `content/*.json` est la source ; `npm run sync-content` les copie dans `supabase/functions/_shared/content/` (les Edge Functions sont déployées sans le reste du dépôt). Toujours lancer après une modification du contenu.
- Le front importe les règles via l'alias `@rules` et le plateau via `@board`. Il ne doit jamais importer `questions.json`.
- Toute écriture passe par la fonction SQL `apply_game_update` (une transaction, verrou optimiste sur `game_state.version` → 409 si l'état a changé).
- Une action refusée pour conflit de version (`ConflictError`) est rejouée automatiquement par `handle` (deux clics simultanés).
- Tests : `npm test` (règles), `npm run typecheck` (front), `npx deno check --node-modules-dir=none supabase/functions/*/index.ts` (Edge Functions).
- Les écarts volontaires à SPEC.md sont listés dans README.md, section « Écarts à la spec ».
