import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { GifMedia, MusicMedia, Round } from "../lib/types";
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

  if (round.media === "dessin" || round.media === "photo") {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex justify-center">
        {image ? (
          <img
            src={image}
            alt={round.media === "dessin" ? "Dessin" : "Photo"}
            className={`rounded-2xl bg-white object-contain ${small ? "max-h-32" : "max-h-[22rem] w-full"}`}
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
        className={`mx-auto rounded-2xl ${small ? "max-h-28" : "max-h-72 w-full object-contain"}`}
      />
    );
  }

  if (round.media === "musique" && round.answer_media) {
    const m = round.answer_media as MusicMedia;
    return (
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-3">
        <div className="flex w-full items-center gap-3">
          <img src={m.cover} alt="" className={`rounded-xl shadow-lg ${small ? "h-12 w-12" : "h-24 w-24"}`} />
          <div className="min-w-0 text-left">
            <p className={`truncate font-display font-bold ${small ? "" : "text-xl"}`}>🎵 {m.title}</p>
            <p className="truncate text-muted">{m.artist}</p>
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
        small ? "text-2xl" : round.media === "emojis" ? "text-7xl" : "text-5xl"
      }`}
    >
      {round.answer_text}
    </motion.p>
  );
}
