// Copie /content/*.json dans supabase/functions/_shared/content/ :
// les Edge Functions sont déployées sans le reste du dépôt.
import { copyFileSync, mkdirSync } from "node:fs";
const dest = "supabase/functions/_shared/content";
mkdirSync(dest, { recursive: true });
for (const f of ["board.json", "questions.json"]) {
  copyFileSync(`content/${f}`, `${dest}/${f}`);
  console.log(`content/${f} -> ${dest}/${f}`);
}
