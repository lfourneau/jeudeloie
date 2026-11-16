import { MAX_UPLOAD_BYTES, validateImageUrl } from "@rules";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Button, Dots, ErrorText } from "./ui";

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
export function PhotoEditor({
  onDone,
  onLink,
  busy,
}: {
  onDone: (jpeg: Blob) => void;
  /** Lien d'image : le serveur la télécharge (puis l'efface à la fin du tour). */
  onLink: (url: string) => void;
  busy: boolean;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState("");
  const [linkOk, setLinkOk] = useState<boolean | null>(null);
  const linkValid = validateImageUrl(link);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  if (linkMode) {
    return (
      <div className="flex flex-col gap-3">
        <label htmlFor="lien-image" className="font-display text-lg font-bold">
          Le lien de l'image
        </label>
        <input
          id="lien-image"
          type="url"
          inputMode="url"
          autoFocus
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setLinkOk(null);
            setError(null);
          }}
          placeholder="https://…/image.jpg"
          autoComplete="off"
          className="champ w-full px-4 py-3 text-[16px]"
        />
        {linkValid.ok && (
          <img
            src={linkValid.value}
            alt="Aperçu de l'image du lien"
            referrerPolicy="no-referrer"
            onLoad={() => setLinkOk(true)}
            onError={() => setLinkOk(false)}
            className={`max-h-80 w-full rotate-[-0.8deg] border-[6px] border-lettre bg-lettre object-contain shadow-[0_10px_20px_-14px_rgba(31,47,74,.6)] ${linkOk === false ? "hidden" : ""}`}
          />
        )}
        <p className="text-[14px] text-muted italic">
          {linkOk === false
            ? "Ce lien ne s'affiche pas comme une image : choisis le lien de l'image elle-même (clic droit, « Copier l'adresse de l'image »)."
            : "L'image est copiée pour ton partenaire, puis effacée dès la fin du tour. JPEG, PNG, WebP ou GIF, 5 Mo maximum."}
        </p>
        <ErrorText>{error ?? (link.trim() && !linkValid.ok ? linkValid.error : null)}</ErrorText>
        <Button onClick={() => linkValid.ok && onLink(linkValid.value)} disabled={!linkValid.ok || linkOk === false} busy={busy}>
          Envoyer cette image
        </Button>
        <Button variant="ghost" onClick={() => setLinkMode(false)} disabled={busy}>
          Plutôt prendre ou choisir une photo
        </Button>
      </div>
    );
  }

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
        <img src={preview} alt="Ta photo" className="max-h-96 w-full rotate-[-0.8deg] border-[6px] border-lettre bg-lettre object-contain shadow-[0_10px_20px_-14px_rgba(31,47,74,.6)]" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-md border-2 border-dashed border-encre/35 bg-papier/60 text-encre/60">
          {working ? <Dots /> : <Icon name="photo" size={64} strokeWidth={1.4} />}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" className="!px-2" onClick={() => camera.current?.click()} disabled={working || busy}>
          <Icon name="photo" size={20} /> Prendre
        </Button>
        <Button variant="secondary" className="!px-2" onClick={() => gallery.current?.click()} disabled={working || busy}>
          <Icon name="galerie" size={20} /> Galerie
        </Button>
        <Button variant="secondary" className="!px-2" onClick={() => setLinkMode(true)} disabled={working || busy}>
          <Icon name="lien" size={20} /> Lien
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
      <Button onClick={() => blob && onDone(blob)} disabled={!blob || working} busy={busy}>
        Envoyer ma photo
      </Button>
    </div>
  );
}
