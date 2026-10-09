// The full-screen frame around every player screen: a status bar on top
// (title, tools, timer, question counter, bookmark) and an action bar at the bottom.
import './player.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatDuration } from '../../lib/engine/results.ts';
import type { ToolBar } from './context.ts';
import { BookmarkIcon, CalculatorIcon, ClockIcon, EyeIcon, PenIcon } from './icons.tsx';

export interface TimerInfo {
  /** Remaining time for timed sections, elapsed time for untimed ones. */
  ms: number;
  countdown: boolean;
  label?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  timer?: TimerInfo;
  counter?: string;
  bookmark?: { on: boolean; toggle: () => void };
  tools?: ToolBar;
  /** Names the screen when it has no question counter, e.g. "Set up" or "Optional break". */
  screen?: string;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

const HIDE_KEY = 'mv:timer-hidden';

function Timer({ ms, countdown, label }: TimerInfo) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setHidden((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? '0' : '1');
      } catch {
        /* not saved */
      }
      return !h;
    });
  };
  const low = countdown && ms <= 5 * 60_000;
  return (
    <div className={`player-timer ${low ? 'is-low' : ''}`}>
      <ClockIcon />
      {hidden ? (
        <span className="player-timer-hidden">Time hidden</span>
      ) : (
        <span>
          <span className="player-timer-label">{label ?? (countdown ? 'Time remaining' : 'Time elapsed')}</span>{' '}
          {/* Not a live region: a clock that announced itself every second would drown out the question.
              The 5-minute warning and the time-up notice are announced as dialogs instead. */}
          <strong className="player-timer-value" role="timer" aria-live="off">
            {formatDuration(ms)}
          </strong>
        </span>
      )}
      <button type="button" className="player-icon-btn" onClick={toggle} aria-label={hidden ? 'Show timer' : 'Hide timer'} title={hidden ? 'Show timer' : 'Hide timer'}>
        <EyeIcon off={!hidden} />
      </button>
    </div>
  );
}

const TOOL_BUTTONS = {
  calculator: { label: 'Calculator', Icon: CalculatorIcon },
  whiteboard: { label: 'Whiteboard', Icon: PenIcon },
} as const;

export default function Shell({ title, subtitle, timer, counter, bookmark, tools, screen, footerLeft, footerRight, children, wide }: Props) {
  // When the screen or the question changes, move keyboard and screen-reader focus to the top of the
  // new content. Otherwise focus stays on the button that was just pressed, at the bottom of the page.
  const main = useRef<HTMLElement>(null);
  const label = [screen ?? counter, subtitle, title].filter(Boolean).join(', ');
  useEffect(() => {
    const el = main.current;
    if (!el) return;
    el.scrollTop = 0;
    if (!document.querySelector('.modal')) el.focus({ preventScroll: true });
  }, [label]);

  return (
    <div className="player">
      <header className="player-bar player-top">
        <div className="player-heading">
          <span className="player-brand">MastersVault</span>
          <span className="player-title">
            {title}
            {subtitle && <span className="player-subtitle"> · {subtitle}</span>}
          </span>
        </div>
        <div className="player-status">
          {tools?.available.map((tool) => {
            const { label, Icon } = TOOL_BUTTONS[tool];
            const on = tools.open.includes(tool);
            return (
              <button key={tool} type="button" className={`player-bar-btn ${on ? 'is-active' : ''}`} aria-pressed={on} onClick={() => tools.toggle(tool)}>
                <Icon />
                <span>{label}</span>
              </button>
            );
          })}
          {timer && <Timer {...timer} />}
          {counter && <span className="player-counter">{counter}</span>}
          {bookmark && (
            <button
              type="button"
              className={`player-bar-btn ${bookmark.on ? 'is-on' : ''}`}
              aria-pressed={bookmark.on}
              onClick={bookmark.toggle}
            >
              <BookmarkIcon filled={bookmark.on} />
              <span>{bookmark.on ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          )}
        </div>
      </header>
      <main className="player-main" ref={main} tabIndex={0} aria-label={label}>
        <div className={`player-content ${wide ? 'is-wide' : ''}`}>{children}</div>
      </main>
      <footer className="player-bar player-bottom">
        <div className="player-actions">{footerLeft}</div>
        <div className="player-actions">{footerRight}</div>
      </footer>
    </div>
  );
}
