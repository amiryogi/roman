export type ButtonVariant = 'solid' | 'outline';

// Pills, as on the reference design. Colours come from the surface (--accent-fill, --on-accent).
// Solid: a soft light sweeps across on hover (`btn-sheen`). Outline: the fill colour sweeps in from
// the left (`btn-fill`). Both are defined in styles/index.css.
const BASE =
  'relative isolate inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-[0.95rem] font-semibold transition-[color,border-color,background-size,filter] duration-300';

const VARIANTS: Record<ButtonVariant, string> = {
  solid: 'bg-(--accent-fill) text-(--on-accent) btn-sheen hover:brightness-110',
  outline: 'btn-fill',
};

/** The button classes, for a plain `<a>` (an external link) that should look the same. */
export function buttonClass(variant: ButtonVariant = 'solid', className?: string): string {
  return [BASE, VARIANTS[variant], className].filter(Boolean).join(' ');
}
