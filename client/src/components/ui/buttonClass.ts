export type ButtonVariant = 'solid' | 'outline';

// Pills, as on the reference design. Colours come from the surface (--accent-fill, --on-accent).
// Solid: a soft light sweeps across on hover (`btn-sheen`). Outline: the fill colour sweeps in from
// the left (`btn-fill`). All three are defined in styles/index.css.
const BASE = 'pill';

const VARIANTS: Record<ButtonVariant, string> = {
  solid: 'bg-(--accent-fill) text-(--on-accent) btn-sheen hover:brightness-110',
  outline: 'btn-fill',
};

/** The button classes, for a plain `<a>` (an external link) that should look the same. */
export function buttonClass(variant: ButtonVariant = 'solid', className?: string): string {
  return [BASE, VARIANTS[variant], className].filter(Boolean).join(' ');
}
