// The full-screen frame around every player screen: a status bar on top
// (title, tools, timer, question counter, bookmark) and an action bar at the bottom.
import './player.css';
import { useState, type ReactNode } from 'react';
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
          <strong className="player-timer-value" aria-live={low ? 'polite' : 'off'}>
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

export default function Shell({ title, subtitle, timer, counter, bookmark, tools, footerLeft, footerRight, children, wide }: Props) {
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
      <main className="player-main">
        <div className={`player-content ${wide ? 'is-wide' : ''}`}>{children}</div>
      </main>
      <footer className="player-bar player-bottom">
        <div className="player-actions">{footerLeft}</div>
        <div className="player-actions">{footerRight}</div>
      </footer>
    </div>
  );
}
