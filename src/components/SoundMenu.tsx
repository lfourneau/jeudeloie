import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { sfx, useAudioSettings } from "../lib/juice";
import { Icon } from "./Icon";

/** Interrupteur dessiné : pastille d'encre qui glisse sur un rail de papier. */
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="flex min-h-11 min-w-14 shrink-0 items-center justify-center"
    >
      <span
        className={`relative block h-7 w-12 rounded-[16px_14px_15px_13px] border-[1.5px] border-encre/60 transition-colors ${
          on ? "bg-ocre" : "bg-papier"
        }`}
      >
        <motion.span
          className="absolute top-[3px] block h-[18px] w-[18px] rounded-full bg-encre"
          animate={{ left: on ? 25 : 3 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
        />
      </span>
    </button>
  );
}

function Row({
  label,
  on,
  volume,
  onToggle,
  onVolume,
}: {
  label: string;
  on: boolean;
  volume: number;
  onToggle: (v: boolean) => void;
  onVolume: (v: number) => void;
}) {
  const id = `vol-${label}`;
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-display text-[17px] font-bold">
          {label}
        </label>
        <Switch on={on} onChange={onToggle} label={`${label} : ${on ? "activée" : "coupée"}`} />
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        disabled={!on}
        onChange={(e) => onVolume(Number(e.target.value) / 100)}
        aria-valuetext={`${Math.round(volume * 100)} %`}
        className="curseur w-full disabled:opacity-40"
      />
    </div>
  );
}

/** Menu du son, présent sur tous les écrans : musique d'ambiance et bruitages, chacun avec son volume. */
export function SoundMenu({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [s, update] = useAudioSettings();
  const ref = useRef<HTMLDivElement>(null);
  const silent = !s.musicOn && !s.sfxOn;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Réglages du son"
        className="pilule flex min-h-11 min-w-11 items-center justify-center border-[1.5px] border-encre/60 bg-lettre px-2.5"
      >
        <Icon name={silent ? "muet" : "son"} size={22} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Réglages du son"
            initial={{ opacity: 0, y: -6, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: 0.8 }}
            exit={{ opacity: 0, y: -6 }}
            className={`feuille absolute z-40 mt-2 w-64 py-2 ${align === "left" ? "left-0" : "right-0"}`}
          >
            <p className="px-3 pb-1 font-display text-[15px] text-muted">Le son, sur cet appareil</p>
            <Row
              label="Musique"
              on={s.musicOn}
              volume={s.musicVolume}
              onToggle={(v) => update({ musicOn: v })}
              onVolume={(v) => update({ musicVolume: v })}
            />
            <div className="mx-3 border-t border-dashed border-encre/25" />
            <Row
              label="Bruitages"
              on={s.sfxOn}
              volume={s.sfxVolume}
              onToggle={(v) => {
                update({ sfxOn: v });
                if (v) window.setTimeout(() => sfx.tick(), 30);
              }}
              onVolume={(v) => update({ sfxVolume: v })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
