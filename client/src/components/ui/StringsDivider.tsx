/** Four hairlines, like violin strings, used as a quiet divider (plan §7.1). Decorative. */
export function StringsDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={['block h-3 w-full text-(--accent) opacity-60', className].join(' ')}
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
    >
      {[1.5, 4.5, 7.5, 10.5].map((y) => (
        <line
          key={y}
          x1="0"
          x2="100"
          y1={y}
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
