// Shared admin button styles: practical, consistent and boring (plan §13).

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700';

export const adminPrimaryButton = `inline-flex min-h-10 items-center rounded-sm bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60 ${focus}`;

export const adminSecondaryButton = `inline-flex min-h-10 items-center rounded-sm border border-stone-300 bg-white px-4 text-sm hover:bg-stone-100 disabled:opacity-60 ${focus}`;

export const adminSmallButton = `inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm border border-stone-300 bg-white px-2 text-sm hover:bg-stone-100 disabled:opacity-40 ${focus}`;

export const adminDangerSmallButton = `inline-flex min-h-9 items-center justify-center rounded-sm border border-red-200 bg-white px-2 text-sm text-red-800 hover:bg-red-50 disabled:opacity-40 ${focus}`;
