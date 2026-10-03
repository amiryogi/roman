import type { ReactNode } from 'react';

import { adminDangerSmallButton, adminSecondaryButton, adminSmallButton } from './adminStyles';

interface RepeatableListProps {
  id: string;
  legend: string;
  hint?: string;
  /** Stable keys for the items (useFieldArray's `fields[i].id`). */
  keys: readonly string[];
  max: number;
  itemLabel: (index: number) => string;
  renderItem: (index: number) => ReactNode;
  addLabel: string;
  emptyMessage: string;
  error?: string | undefined;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

/**
 * An editable list inside a form (profile biography, education…): add, remove and keyboard
 * accessible move up/down buttons (plan §13).
 */
export function RepeatableList({
  id,
  legend,
  hint,
  keys,
  max,
  itemLabel,
  renderItem,
  addLabel,
  emptyMessage,
  error,
  onAdd,
  onRemove,
  onMove,
}: RepeatableListProps) {
  return (
    <fieldset id={id} className="flex scroll-mt-6 flex-col gap-4">
      <legend className="mb-2 text-lg font-semibold">{legend}</legend>
      {hint && <p className="-mt-2 text-sm text-stone-600">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      {keys.length === 0 ? (
        <p className="rounded-sm border border-dashed border-stone-300 bg-white p-4 text-center text-sm text-stone-600">
          {emptyMessage}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {keys.map((key, index) => {
            const label = itemLabel(index);
            return (
              <li
                key={key}
                aria-label={label}
                className="flex flex-col gap-4 rounded-sm border border-stone-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-700">{label}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      aria-label={`Move up: ${label}`}
                      onClick={() => {
                        onMove(index, index - 1);
                      }}
                      className={adminSmallButton}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === keys.length - 1}
                      aria-label={`Move down: ${label}`}
                      onClick={() => {
                        onMove(index, index + 1);
                      }}
                      className={adminSmallButton}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(index);
                      }}
                      className={adminDangerSmallButton}
                    >
                      Remove<span className="sr-only">: {label}</span>
                    </button>
                  </div>
                </div>
                {renderItem(index)}
              </li>
            );
          })}
        </ol>
      )}
      <div>
        <button
          type="button"
          disabled={keys.length >= max}
          onClick={onAdd}
          className={adminSecondaryButton}
        >
          {addLabel}
        </button>
      </div>
    </fieldset>
  );
}
