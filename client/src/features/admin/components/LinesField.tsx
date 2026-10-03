import { useState, type Ref } from 'react';

import { TextAreaField } from './Fields';

interface LinesFieldProps {
  label: string;
  hint?: string;
  error?: string | undefined;
  rows?: number;
  value: readonly string[];
  onChange: (lines: string[]) => void;
  onBlur: () => void;
  name: string;
  ref?: Ref<HTMLTextAreaElement>;
}

function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * A list of short strings edited as one entry per line (skills, highlights). The text is kept
 * locally so blank lines and trailing spaces survive while typing; the form gets clean entries.
 */
export function LinesField({ value, onChange, rows = 4, ...props }: LinesFieldProps) {
  const [text, setText] = useState(() => value.join('\n'));
  return (
    <TextAreaField
      {...props}
      rows={rows}
      value={text}
      onChange={(event) => {
        setText(event.currentTarget.value);
        onChange(toLines(event.currentTarget.value));
      }}
    />
  );
}
