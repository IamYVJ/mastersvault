// Sortable table for Table Analysis questions. Like the exam, sorting is
// ascending by the chosen column; clicking a header again reverses it.
import { useMemo, useState } from 'react';
import type { RenderedTable } from '../../lib/content/types.ts';

export default function DataTable({ table, id }: { table: RenderedTable; id: string }) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return table.rows;
    return [...table.rows].sort((a, b) => {
      const x = a[sort.col].value;
      const y = b[sort.col].value;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [table.rows, sort]);

  const sortBy = (col: number) =>
    setSort((s) => (s && s.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: 1 }));

  return (
    <div className="q-table">
      <div className="q-table-tools">
        <label htmlFor={`${id}-sort`}>Sort by</label>
        <select
          id={`${id}-sort`}
          value={sort ? String(sort.col) : ''}
          onChange={(e) => setSort(e.target.value === '' ? null : { col: Number(e.target.value), dir: 1 })}
        >
          <option value="">Original order</option>
          {table.columns.map((c, i) => (
            <option key={c.label} value={i}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="q-table-scroll" tabIndex={0} role="region" aria-label={table.caption ?? 'Data table'}>
        <table>
          {table.caption && <caption>{table.caption}</caption>}
          <thead>
            <tr>
              {table.columns.map((c, i) => (
                <th
                  key={c.label}
                  scope="col"
                  className={c.type === 'number' ? 'num' : undefined}
                  aria-sort={sort?.col === i ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
                >
                  <button type="button" onClick={() => sortBy(i)}>
                    {c.label}
                    <span className="q-sort-mark" aria-hidden="true">
                      {sort?.col === i ? (sort.dir === 1 ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={table.columns[c].type === 'number' ? 'num' : undefined}>
                    {cell.display}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
