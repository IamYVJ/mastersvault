// A simple scratch whiteboard: pen, eraser, undo and clear.
// Strokes are kept in memory for the current section only.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Tool = 'pen' | 'eraser';
interface Stroke {
  tool: Tool;
  size: number;
  points: [number, number][];
}

const HEIGHT = 360;

export default function Whiteboard() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [size, setSize] = useState(2);
  const current = useRef<Stroke | null>(null);

  const paint = useCallback((ctx: CanvasRenderingContext2D, s: Stroke) => {
    ctx.save();
    ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = getComputedStyle(ctx.canvas).color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = s.tool === 'eraser' ? s.size * 8 : s.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const [first, ...rest] = s.points;
    if (!rest.length) {
      ctx.beginPath();
      ctx.arc(first[0], first[1], ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(first[0], first[1]);
      for (const [x, y] of rest) ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const redraw = useCallback(() => {
    const el = canvas.current;
    if (!el) return;
    const ratio = window.devicePixelRatio || 1;
    const width = el.clientWidth;
    if (el.width !== Math.round(width * ratio) || el.height !== Math.round(HEIGHT * ratio)) {
      el.width = Math.round(width * ratio);
      el.height = Math.round(HEIGHT * ratio);
    }
    const ctx = el.getContext('2d')!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);
    for (const s of strokes) paint(ctx, s);
    if (current.current) paint(ctx, current.current);
  }, [strokes, paint]);

  useEffect(() => {
    redraw();
    const el = canvas.current;
    if (!el) return;
    // Redraw when the panel is shown or resized, and when the colour theme changes.
    const ro = new ResizeObserver(redraw);
    ro.observe(el);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', redraw);
    return () => {
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener('change', redraw);
    };
  }, [redraw]);

  const point = (e: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = { tool, size, points: [point(e)] };
    redraw();
  };
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    current.current.points.push(point(e));
    redraw();
  };
  const onUp = () => {
    const s = current.current;
    current.current = null;
    if (s) setStrokes((list) => [...list, s]);
  };

  return (
    <div className="board">
      <div className="board-tools" role="toolbar" aria-label="Whiteboard tools">
        <button type="button" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')} data-autofocus>
          Pen
        </button>
        <button type="button" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>
          Eraser
        </button>
        <label>
          <span className="visually-hidden">Line width</span>
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
            <option value={1.5}>Fine</option>
            <option value={2.5}>Medium</option>
            <option value={4}>Thick</option>
          </select>
        </label>
        <span className="board-spacer" />
        <button type="button" onClick={() => setStrokes((list) => list.slice(0, -1))} disabled={!strokes.length}>
          Undo
        </button>
        <button type="button" onClick={() => setStrokes([])} disabled={!strokes.length}>
          Clear
        </button>
      </div>
      <canvas
        ref={canvas}
        className="board-canvas"
        style={{ height: HEIGHT }}
        aria-label="Whiteboard drawing area"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
