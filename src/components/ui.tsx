import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  className = "",
  busy,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: "bg-rose text-white shadow-lg shadow-rose/30 active:scale-[0.98]",
    secondary: "bg-plum-light text-ink active:scale-[0.98]",
    ghost: "bg-transparent text-muted underline-offset-4 hover:underline",
  };
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`w-full rounded-2xl px-5 py-3.5 font-display text-lg font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {busy ? "…" : children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-plum/80 p-5 shadow-xl ring-1 ring-white/5 ${className}`}>{children}</div>;
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-4">{children}</div>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-rose/15 px-3 py-2 text-sm text-rose-soft">{children}</p>;
}

export function Dots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

export const MEDIA_LABEL: Record<string, { label: string; icon: string; hint: string }> = {
  mot: { label: "un mot", icon: "🔤", hint: "Un seul mot, sans espace" },
  nombre: { label: "un nombre", icon: "🔢", hint: "Un nombre entier ou décimal" },
  emojis: { label: "des emojis", icon: "😍", hint: "1 à 3 emojis" },
  dessin: { label: "un dessin", icon: "🎨", hint: "" },
  photo: { label: "une photo", icon: "📷", hint: "" },
};
