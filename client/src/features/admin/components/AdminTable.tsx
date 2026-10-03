import type { ReactNode } from 'react';

import { adminSmallButton as smallButton } from './adminStyles';

export interface AdminColumn<T> {
  header: string;
  cell: (item: T) => ReactNode;
  /** Hide on small screens (the first column and actions always show). */
  wide?: boolean;
  className?: string;
}

interface AdminTableProps<T> {
  caption: string;
  items: readonly T[];
  columns: readonly AdminColumn<T>[];
  getKey: (item: T) => string;
  /** Move up/down buttons (keyboard-accessible reordering, plan §13). */
  onMove?: (index: number, direction: -1 | 1) => void;
  moveLabel?: (item: T) => string;
  actions?: (item: T) => ReactNode;
  busy?: boolean;
}

/** The one generic admin list (plan §13): typed columns, optional reorder buttons and actions. */
export function AdminTable<T>({
  caption,
  items,
  columns,
  getKey,
  onMove,
  moveLabel,
  actions,
  busy = false,
}: AdminTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-sm border border-stone-200 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-stone-200 bg-stone-50 text-xs tracking-wide text-stone-600 uppercase">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={[
                  'px-4 py-3 font-medium',
                  column.wide ? 'hidden md:table-cell' : '',
                ].join(' ')}
              >
                {column.header}
              </th>
            ))}
            {onMove && (
              <th scope="col" className="px-4 py-3 font-medium">
                Order
              </th>
            )}
            {actions && (
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => (
            <tr key={getKey(item)} className="align-middle">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={[
                    'px-4 py-3',
                    column.wide ? 'hidden md:table-cell' : '',
                    column.className ?? '',
                  ].join(' ')}
                >
                  {column.cell(item)}
                </td>
              ))}
              {onMove && (
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onMove(index, -1);
                      }}
                      disabled={busy || index === 0}
                      aria-label={`Move up: ${moveLabel?.(item) ?? ''}`}
                      className={smallButton}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMove(index, 1);
                      }}
                      disabled={busy || index === items.length - 1}
                      aria-label={`Move down: ${moveLabel?.(item) ?? ''}`}
                      className={smallButton}
                    >
                      ↓
                    </button>
                  </div>
                </td>
              )}
              {actions && (
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">{actions(item)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
