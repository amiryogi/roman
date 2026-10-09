interface ViolinLoaderProps {
  /** e.g. `[--violin-loader-size:5rem]` (default 6.5rem tall). */
  className?: string;
}

/**
 * The site's loading mark: Roman's violin being bowed while notes rise (styles in index.css).
 * Decorative: always pair it with text that says what is loading.
 */
export function ViolinLoader({ className }: ViolinLoaderProps) {
  return (
    <span aria-hidden="true" className={className ? `violin-loader ${className}` : 'violin-loader'}>
      <span className="violin-loader-instrument">
        <img src="/images/violin.png" alt="" width={63} height={168} decoding="async" />
        <span className="violin-loader-bow" />
      </span>
    </span>
  );
}
