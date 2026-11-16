import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { GifMedia, LinkMedia, MusicMedia, Round } from "../lib/types";
import { Icon } from "./Icon";
import { Dots } from "./ui";

/** URL signée (1 h) d'un dessin ou d'une photo : la RLS du bucket limite la lecture aux joueurs de la salle. */
function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    supabase.storage
      .from("answers")
      .createSignedUrl(path, 3600)
      .then(({ data }) => !cancelled && setUrl(data?.signedUrl ?? null));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

/** Affiche la réponse d'un tour, quel que soit le média. `size="sm"` pour le bilan de fin. */
export function AnswerView({ round, size = "lg" }: { round: Round; size?: "lg" | "sm" }) {
  const small = size === "sm";
  const image = useSignedUrl(round.answer_media_path);

  // Photo venue d'un lien : effacée du stockage à la fin du tour.
  if (round.media === "photo" && (round.answer_media as LinkMedia | null)?.efface) {
    return (
      <div
        className={`mx-auto flex flex-col items-center justify-center gap-1 border-2 border-dashed border-encre/30 bg-papier/60 px-4 text-center text-muted italic ${small ? "h-20 text-[13px]" : "h-40"}`}
      >
        <Icon name="galerie" size={small ? 22 : 36} strokeWidth={1.4} />
        Image effacée après le tour
        {!small && <span className="text-[13px]">Elle venait d'un lien.</span>}
      </div>
    );
  }

  if (round.media === "dessin" || round.media === "photo") {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex justify-center">
        {image ? (
          <img
            src={image}
            alt={round.media === "dessin" ? "Dessin" : "Photo"}
            className={`border-[6px] border-lettre bg-lettre object-contain shadow-[0_10px_20px_-14px_rgba(31,47,74,.6)] ${small ? "max-h-32 rotate-[-1.5deg]" : "max-h-[22rem] w-full rotate-[-0.8deg]"}`}
          />
        ) : (
          <div className={`flex items-center justify-center text-muted ${small ? "h-20" : "h-60"}`}>
            <Dots />
          </div>
        )}
      </motion.div>
    );
  }

  if (round.media === "gif" && round.answer_media) {
    const g = round.answer_media as GifMedia;
    return (
      <motion.img
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={g.url}
        alt={g.title}
        className={`mx-auto border-[6px] border-lettre shadow-[0_10px_20px_-14px_rgba(31,47,74,.6)] ${small ? "max-h-28" : "max-h-72 w-full object-contain"}`}
      />
    );
  }

  if (round.media === "musique" && round.answer_media) {
    const m = round.answer_media as MusicMedia;
    return (
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-3">
        <div className="flex w-full items-center gap-3">
          <img src={m.cover} alt="" className={`rotate-[-2deg] border-4 border-lettre shadow-[0_10px_20px_-14px_rgba(31,47,74,.6)] ${small ? "h-12 w-12" : "h-24 w-24"}`} />
          <div className="min-w-0 text-left">
            <p className={`flex items-center gap-1.5 font-display font-bold break-words ${small ? "" : "text-xl"}`}>
              <Icon name="musique" size={small ? 16 : 20} /> <span className="min-w-0 truncate">{m.title}</span>
            </p>
            <p className="truncate text-muted italic">{m.artist}</p>
          </div>
        </div>
        {!small && m.preview && <audio controls src={m.preview} className="w-full" />}
      </motion.div>
    );
  }

  return (
    <motion.p
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 14 }}
      className={`break-words text-center font-display font-bold ${
        small ? "text-2xl" : round.media === "emojis" ? "text-7xl" : "-rotate-2 text-5xl"
      }`}
    >
      {round.answer_text}
    </motion.p>
  );
}
