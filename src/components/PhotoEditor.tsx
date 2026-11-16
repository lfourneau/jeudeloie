import { MAX_UPLOAD_BYTES } from "@rules";
import { useEffect, useRef, useState } from "react";
import { Button, ErrorText } from "./ui";

const MAX_SIDE = 1280;

/** Redimensionne et compresse en JPEG jusqu'à passer sous la limite (1 Mo). */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES * 0.95) return blob;
    }
    scale *= 0.75;
  }
  throw new Error("Image impossible à compresser sous 1 Mo.");
}

/** Photo prise avec l'appareil ou choisie dans la galerie, compressée côté client. */
export function PhotoEditor({ onDone, busy }: { onDone: (jpeg: Blob) => void; busy: boolean }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setWorking(true);
    setError(null);
    try {
      const jpeg = await compressImage(file);
      setBlob(jpeg);
      setPreview(URL.createObjectURL(jpeg));
    } catch {
      setError("Cette image n'a pas pu être lue. Essaie une autre photo (JPEG ou PNG).");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={pick} />
      {preview ? (
        <img src={preview} alt="Ta photo" className="max-h-96 w-full rounded-2xl object-contain bg-night/60" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-night/60 text-6xl ring-2 ring-white/10 ring-dashed">
          {working ? "⏳" : "📷"}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => camera.current?.click()} disabled={working || busy}>
          📸 Prendre
        </Button>
        <Button variant="secondary" onClick={() => gallery.current?.click()} disabled={working || busy}>
          🖼️ Galerie
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button onClick={() => blob && onDone(blob)} disabled={!blob || working} busy={busy}>
        Envoyer ma photo
      </Button>
    </div>
  );
}
