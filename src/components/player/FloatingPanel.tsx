// A non-modal panel that floats over the test and can be dragged by its title bar.
import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { CrossIcon } from './icons.tsx';

// Remember where each panel was left while the page is open.
const positions = new Map<string, { x: number; y: number }>();

interface Props {
  id: string;
  title: string;
  hidden: boolean;
  onClose: () => void;
  width: number;
  /** Where the panel first appears: near the right or left edge, below the top bar. */
  side?: 'left' | 'right';
  children: ReactNode;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function FloatingPanel({ id, title, hidden, onClose, width, side = 'right', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // The default spot is worked out the first time the panel is shown, when the window has its real size.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => positions.get(id) ?? null);
  const defaultPos = () => ({ x: side === 'right' ? Math.max(16, window.innerWidth - width - 24) : 24, y: 76 });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const keepInView = (p: { x: number; y: number }) => {
    const el = ref.current;
    // Nothing to fit into while the panel or the window has no size.
    if (!el || el.hidden || !window.innerWidth || !window.innerHeight) return p;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return { x: clamp(p.x, 0, Math.max(0, window.innerWidth - w)), y: clamp(p.y, 0, Math.max(0, window.innerHeight - h)) };
  };

  useEffect(() => {
    if (pos) positions.set(id, pos);
  }, [id, pos]);

  useEffect(() => {
    const onResize = () => setPos((p) => p && keepInView(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  useEffect(() => {
    if (!hidden) {
      setPos((p) => keepInView(p ?? defaultPos()));
      ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
  }, [hidden]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!pos) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (drag.current) setPos(keepInView({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={ref}
      className="floating-panel"
      role="dialog"
      aria-label={title}
      hidden={hidden}
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, width: `min(${width}px, calc(100vw - 16px))` }}
      onKeyDown={(e) => e.key === 'Escape' && e.target === e.currentTarget && onClose()}
    >
      <div className="floating-panel-bar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <span>{title}</span>
        <button type="button" className="floating-panel-close" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
          <CrossIcon />
        </button>
      </div>
      <div className="floating-panel-body">{children}</div>
    </div>
  );
}
