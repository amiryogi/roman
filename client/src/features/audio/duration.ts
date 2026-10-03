function whole(seconds: number): number {
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
}

/** 225 → "3:45"; 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  const total = whole(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${secs}`
    : `${String(minutes)}:${secs}`;
}

function unit(value: number, name: string): string {
  return `${String(value)} ${name}${value === 1 ? '' : 's'}`;
}

/** 83 → "1 minute 23 seconds", for screen readers (plan §18). */
export function spokenDuration(seconds: number): string {
  const total = whole(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts = [
    hours > 0 ? unit(hours, 'hour') : '',
    minutes > 0 ? unit(minutes, 'minute') : '',
    secs > 0 || total === 0 ? unit(secs, 'second') : '',
  ].filter(Boolean);
  return parts.join(' ');
}
