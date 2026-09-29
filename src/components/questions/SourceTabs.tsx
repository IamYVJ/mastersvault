// Tabbed sources for Multi-Source Reasoning.
import { useId, useState, type KeyboardEvent } from 'react';
import type { RenderedSourceSet } from '../../lib/content/types.ts';
import Chart from './Chart.tsx';

export default function SourceTabs({ sources }: { sources: RenderedSourceSet }) {
  const [active, setActive] = useState(0);
  const base = useId();

  const onKey = (e: KeyboardEvent) => {
    const n = sources.tabs.length;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (active + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
    setActive(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  };

  return (
    <div className="q-tabs">
      <div role="tablist" aria-label={sources.title ?? 'Sources'} className="q-tablist" onKeyDown={onKey}>
        {sources.tabs.map((t, i) => (
          <button
            key={t.title}
            id={`${base}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`${base}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {t.title}
          </button>
        ))}
      </div>
      {sources.tabs.map((t, i) => (
        <div
          key={t.title}
          id={`${base}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${i}`}
          hidden={i !== active}
          className="q-tabpanel q-prose"
        >
          {t.html && <div dangerouslySetInnerHTML={{ __html: t.html }} />}
          {t.chart && <Chart chart={t.chart} />}
        </div>
      ))}
    </div>
  );
}
