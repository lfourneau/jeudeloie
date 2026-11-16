import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  busy,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: "pilule bg-encre text-lettre text-xl shadow-[0_8px_18px_-12px_rgba(31,47,74,.8)] hover:bg-encre-claire active:scale-[0.98]",
    secondary: "pilule border-[1.5px] border-encre/60 bg-lettre text-encre text-lg hover:bg-papier active:scale-[0.98]",
    ghost: "bg-transparent text-encre-claire text-base underline decoration-encre/30 underline-offset-4 hover:decoration-cachet",
  };
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 px-5 py-2.5 font-display font-bold transition disabled:opacity-45 ${styles[variant]} ${className}`}
    >
      {busy ? <Dots /> : children}
    </button>
  );
}

/** Feuille de papier. `tilt` penche légèrement la feuille. */
export function Card({ children, className = "", tilt = 0 }: { children: ReactNode; className?: string; tilt?: number }) {
  return (
    <div className={`feuille p-5 ${className}`} style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}>
      {children}
    </div>
  );
}

/** Lettre sur papier ligné, avec un timbre penché en coin si `stamp` est fourni. */
export function Letter({ children, className = "", stamp }: { children: ReactNode; className?: string; stamp?: ReactNode }) {
  return (
    <div className={`lettre relative ${className}`}>
      {stamp && (
        <div className="timbre absolute -top-3 right-3 flex min-h-12 min-w-11 rotate-[4deg] items-center justify-center px-1.5 py-1 font-display text-sm leading-tight font-bold">
          {stamp}
        </div>
      )}
      {children}
    </div>
  );
}

/** Petit intitulé manuscrit au-dessus d'un bloc. */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-display text-[15px] text-muted ${className}`}>{children}</p>;
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-4">{children}</div>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="border-l-2 border-cachet bg-lettre/70 px-3 py-2 text-[15px] text-cachet italic">
      {children}
    </p>
  );
}

export function Dots() {
  return (
    <span className="inline-flex gap-1 align-middle" aria-label="patiente">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

export const MEDIA_LABEL: Record<string, { label: string; icon: IconName; hint: string }> = {
  mot: { label: "un mot", icon: "mot", hint: "Un seul mot, sans espace" },
  nombre: { label: "un chiffre", icon: "nombre", hint: "Un nombre entier ou décimal" },
  emojis: { label: "des emojis", icon: "emojis", hint: "1 à 3 emojis" },
  dessin: { label: "un dessin", icon: "dessin", hint: "60 secondes pour dessiner" },
  photo: { label: "une photo", icon: "photo", hint: "Prends une photo ou choisis-en une" },
  musique: { label: "une musique", icon: "musique", hint: "Cherche un morceau" },
  gif: { label: "un GIF", icon: "gif", hint: "Cherche un GIF" },
};
