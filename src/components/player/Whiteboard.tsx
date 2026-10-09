// A simple scratch whiteboard: pen, eraser, undo and clear, plus a typed-notes mode for anyone who
// can't or doesn't want to draw with a pointer. Contents are kept in memory for the current section only.
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
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [notes, setNotes] = useState('');
  const typing = mode === 'type';
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const firstRender = useRef(true);
  // Choosing Type puts the cursor straight into the notes.
  useEffect(() => {
    if (firstRender.current) firstRender.current = false;
    else if (typing) notesRef.current?.focus();
  }, [typing]);
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
        <button
          type="button"
          aria-pressed={!typing && tool === 'pen'}
          onClick={() => {
            setMode('draw');
            setTool('pen');
          }}
          data-autofocus
        >
          Pen
        </button>
        <button
          type="button"
          aria-pressed={!typing && tool === 'eraser'}
          onClick={() => {
            setMode('draw');
            setTool('eraser');
          }}
        >
          Eraser
        </button>
        <button type="button" aria-pressed={typing} onClick={() => setMode(typing ? 'draw' : 'type')}>
          Type
        </button>
        <label>
          <span className="visually-hidden">Line width</span>
          <select value={size} disabled={typing} onChange={(e) => setSize(Number(e.target.value))}>
            <option value={1.5}>Fine</option>
            <option value={2.5}>Medium</option>
            <option value={4}>Thick</option>
          </select>
        </label>
        <span className="board-spacer" />
        <button type="button" onClick={() => setStrokes((list) => list.slice(0, -1))} disabled={typing || !strokes.length}>
          Undo
        </button>
        <button type="button" onClick={() => (typing ? setNotes('') : setStrokes([]))} disabled={typing ? !notes : !strokes.length}>
          Clear
        </button>
      </div>
      {/* Both stay mounted so that switching modes keeps the drawing and the notes. */}
      <textarea
        className="board-notes"
        style={{ height: HEIGHT }}
        hidden={!typing}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        aria-label="Typed notes"
        placeholder="Type your working here"
        spellCheck={false}
        ref={notesRef}
      />
      <canvas
        ref={canvas}
        className="board-canvas"
        style={{ height: HEIGHT }}
        hidden={typing}
        role="img"
        aria-label="Whiteboard drawing area. To take notes with the keyboard, choose Type."
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
    </div>
  );
}
