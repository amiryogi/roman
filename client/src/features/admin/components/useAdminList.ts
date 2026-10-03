import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { publicationStatusSchema } from '@roman/shared';

import type { AdminListParams } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';

/** List filters live in the URL, so they survive reloads and the back button (plan §12.3). */
export function useAdminListParams() {
  const [search, setSearch] = useSearchParams();
  const status = publicationStatusSchema.safeParse(search.get('status'));
  const page = Number(search.get('page') ?? '1');
  const q = search.get('q')?.trim() ?? '';

  const params: AdminListParams = {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    ...(status.success ? { status: status.data } : {}),
    ...(q ? { q } : {}),
  };

  function update(changes: Partial<Record<'status' | 'q' | 'page', string>>) {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Any filter change starts again at page 1.
    if (!('page' in changes)) next.delete('page');
    setSearch(next, { replace: true });
  }

  return { params, update };
}

/** Invalidates admin and public caches after content changes, so both show the new state. */
export function useInvalidate(...keys: QueryKey[]) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))).then(
      () => undefined,
    );
}

/** Move up/down within the visible list; the server swaps sort positions (plan §13). */
export function useMove(
  items: readonly { id: string }[] | undefined,
  save: (ids: string[]) => Promise<void>,
  onSaved: () => Promise<void>,
) {
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: onSaved,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  function move(index: number, direction: -1 | 1) {
    if (!items) return;
    const target = index + direction;
    const ids = items.map((item) => item.id);
    const [moved] = ids.splice(index, 1);
    if (moved === undefined || target < 0 || target > ids.length) return;
    ids.splice(target, 0, moved);
    mutation.mutate(ids);
  }

  return { move, busy: mutation.isPending };
}
