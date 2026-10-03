// Decorative icons: the buttons that contain them always carry a text label.

interface IconProps {
  className?: string;
}

function Icon({ className = 'size-5', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </Icon>
  );
}

export function PreviousIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="5" width="2.5" height="14" rx="1" />
      <path d="M19 6.2v11.6a1 1 0 0 1-1.55.83L9.2 13.1a1.3 1.3 0 0 1 0-2.2l8.25-5.53A1 1 0 0 1 19 6.2Z" />
    </Icon>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
      <path d="M5 6.2v11.6a1 1 0 0 0 1.55.83l8.25-5.53a1.3 1.3 0 0 0 0-2.2L6.55 5.37A1 1 0 0 0 5 6.2Z" />
    </Icon>
  );
}

export function VolumeIcon({ muted, ...props }: IconProps & { muted: boolean }) {
  return (
    <Icon {...props}>
      <path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.4 3.67A1 1 0 0 0 14 18.4V5.6a1 1 0 0 0-1.6-.77L8 8.5H5a1 1 0 0 0-1 1Z" />
      {muted ? (
        <path
          d="m17 9.5 5 5m0-5-5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Icon>
  );
}

/** Three bars that move like a vibrating string while a track plays (static for reduced motion). */
export function PlayingIndicator({
  active,
  className = 'size-4',
}: IconProps & { active: boolean }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-end gap-[2px] ${className}`}>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={[
            'w-[3px] rounded-full bg-current',
            active ? 'h-full origin-bottom animate-string motion-reduce:animate-none' : 'h-1/3',
          ].join(' ')}
          style={{ animationDelay: `${String(delay)}ms` }}
        />
      ))}
    </span>
  );
}
