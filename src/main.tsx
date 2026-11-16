import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Page d'aperçu des écrans (données fictives), seulement en développement : `/?apercu=<écran>`.
// `import.meta.env.DEV` vaut false au build, donc Vite retire ce code et le fichier de l'aperçu.
const apercu = import.meta.env.DEV ? new URLSearchParams(location.search).get("apercu") : null;
const Preview = import.meta.env.DEV ? lazy(() => import("./dev/Preview").then((m) => ({ default: m.Preview }))) : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {apercu !== null && Preview ? (
      <Suspense fallback={null}>
        <Preview screen={apercu} />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
