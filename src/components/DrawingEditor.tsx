import { DRAWING_SECONDS } from "@rules";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui";

const SIZE = 600; // résolution interne du dessin (carré)
const COLORS = ["#1e1033", "#ff5c8a", "#ffc94d", "#5fe3b5", "#6ec3ff", "#b79bff", "#ffa36c", "#8b5a2b"];
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
    ctx.fillStyle = "#ffffff";
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
    current.current = { color: eraser ? "#ffffff" : color, width: eraser ? 36 : width, points: [toPoint(e)] };
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
        <span className="text-muted">Dessine ta réponse</span>
        <span className={`font-display text-lg font-bold ${left <= 10 ? "text-rose" : ""}`}>⏱ {left}s</span>
      </div>
      <canvas
        ref={canvas}
        width={SIZE}
        height={SIZE}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="aspect-square w-full touch-none rounded-2xl bg-white shadow-inner"
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
            className={`h-8 w-8 rounded-full ring-2 ${!eraser && color === c ? "ring-white" : "ring-transparent"}`}
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
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${!eraser && width === w ? "bg-rose" : "bg-plum-light"}`}
            aria-label={`Épaisseur ${w}`}
          >
            <span className="rounded-full bg-white" style={{ width: w / 2 + 3, height: w / 2 + 3 }} />
          </button>
        ))}
        <button onClick={() => setEraser(true)} className={`rounded-xl px-3 py-2 text-sm ${eraser ? "bg-rose" : "bg-plum-light"}`}>
          🧽 Gomme
        </button>
        <button onClick={undo} disabled={count === 0} className="rounded-xl bg-plum-light px-3 py-2 text-sm disabled:opacity-40">
          ↶ Annuler
        </button>
        <button onClick={clear} disabled={count === 0} className="rounded-xl bg-plum-light px-3 py-2 text-sm disabled:opacity-40">
          Effacer
        </button>
      </div>
      <Button onClick={finish} busy={busy} disabled={count === 0}>
        Envoyer mon dessin
      </Button>
    </div>
  );
}
