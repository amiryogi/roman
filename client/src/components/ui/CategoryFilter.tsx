import { Link } from 'react-router';

interface CategoryFilterProps<T extends string> {
  label: string;
  categories: readonly T[];
  labels: Record<T, string>;
  current: T | undefined;
}

/**
 * Category chips as links (`?category=`), so filters are shareable and work with the back button
 * (plan §12.3). The current choice is marked with aria-current.
 */
export function CategoryFilter<T extends string>({
  label,
  categories,
  labels,
  current,
}: CategoryFilterProps<T>) {
  const chip =
    'inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors aria-[current=true]:border-(--accent) aria-[current=true]:bg-(--accent) aria-[current=true]:text-(--on-accent) border-current/30 hover:border-current';
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            to={{ search: '' }}
            replace
            aria-current={current === undefined ? 'true' : undefined}
            className={chip}
          >
            All
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category}>
            <Link
              to={{ search: `?category=${category}` }}
              replace
              aria-current={current === category ? 'true' : undefined}
              className={chip}
            >
              {labels[category]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
