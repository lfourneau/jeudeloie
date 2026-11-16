import { DRAWING_SECONDS } from "@rules";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Button } from "./ui";

const TOOL = "pilule flex min-h-11 items-center gap-1 border-[1.5px] px-3 font-display text-[15px] font-bold disabled:opacity-40";

const SIZE = 600; // résolution interne du dessin (carré)
// Encre, cachet et lavis du carnet (teintes foncées des lavis pour rester visibles sur le papier).
const COLORS = ["#1F2F4A", "#2B4366", "#B5442E", "#D4A443", "#D99686", "#8AA583", "#7E99BC", "#E6BE6A"];
const PAPER = "#FBF6EC";
const WIDTHS = [4, 10, 22];

interface Stroke {
  color: string;
  width: number;
  points: [number, number][];
}

/** Dessin au doigt ou à la souris, 60 secondes, export PNG. */
export function DrawingEditor({ onDone, busy }: { onDone: (png: Blob) => void; busy: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [eraser, setEraser] = useState(false);
  const [count, setCount] = useState(0); // nombre de traits, pour activer « Annuler »
  const [left, setLeft] = useState(DRAWING_SECONDS);
  const sent = useRef(false);

  const redraw = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.1, s.points[0][1]);
      ctx.stroke();
    }
  }, []);

  useEffect(redraw, [redraw]);

  const finish = useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    canvas.current?.toBlob((b) => b && onDone(b), "image/png");
  }, [onDone]);

  // Chrono : à zéro, le dessin part tel quel.
  useEffect(() => {
    if (left <= 0) {
      finish();
      return;
    }
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, finish]);

  const toPoint = (e: React.PointerEvent): [number, number] => {
    const rect = canvas.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * SIZE, ((e.clientY - rect.top) / rect.height) * SIZE];
  };

  const down = (e: React.PointerEvent) => {
    if (sent.current) return;
    canvas.current!.setPointerCapture(e.pointerId);
    current.current = { color: eraser ? PAPER : color, width: eraser ? 36 : width, points: [toPoint(e)] };
    redraw();
  };
  const move = (e: React.PointerEvent) => {
    if (!current.current) return;
    current.current.points.push(toPoint(e));
    redraw();
  };
  const up = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    setCount(strokes.current.length);
  };

  const undo = () => {
    strokes.current.pop();
    setCount(strokes.current.length);
    redraw();
  };
  const clear = () => {
    strokes.current = [];
    setCount(0);
    redraw();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-display text-lg text-muted">Dessine ta réponse</span>
        <span className={`flex items-center gap-1 font-display text-xl font-bold ${left <= 10 ? "text-cachet" : ""}`}>
          <Icon name="horloge" size={20} /> {left} s
        </span>
      </div>
      <canvas
        ref={canvas}
        width={SIZE}
        height={SIZE}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="aspect-square w-full touch-none rounded-sm border-[1.5px] border-encre/40 bg-lettre shadow-[inset_0_0_18px_rgba(31,47,74,.08)]"
      />
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            aria-label={`Couleur ${c}`}
            onClick={() => {
              setColor(c);
              setEraser(false);
            }}
            aria-pressed={!eraser && color === c}
            className={`forme-${(COLORS.indexOf(c) % 4) + 1} h-11 w-11 border-[1.5px] border-encre/50 ${!eraser && color === c ? "ring-2 ring-cachet ring-offset-2 ring-offset-lettre" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => {
              setWidth(w);
              setEraser(false);
            }}
            aria-pressed={!eraser && width === w}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] ${!eraser && width === w ? "border-cachet bg-rose/50" : "border-encre/30 bg-lettre"}`}
            aria-label={`Épaisseur ${w}`}
          >
            <span className="rounded-full bg-encre" style={{ width: w / 2 + 3, height: w / 2 + 3 }} />
          </button>
        ))}
        <button
          onClick={() => setEraser(true)}
          aria-pressed={eraser}
          className={`${TOOL} ${eraser ? "border-cachet bg-rose/50" : "border-encre/30 bg-lettre"}`}
        >
          <Icon name="gomme" size={18} /> Gomme
        </button>
        <button onClick={undo} disabled={count === 0} className={`${TOOL} border-encre/30 bg-lettre`}>
          <Icon name="annuler" size={18} /> Annuler
        </button>
        <button onClick={clear} disabled={count === 0} className={`${TOOL} border-encre/30 bg-lettre`}>
          Tout effacer
        </button>
      </div>
      <Button onClick={finish} busy={busy} disabled={count === 0}>
        Envoyer mon dessin
      </Button>
    </div>
  );
}
