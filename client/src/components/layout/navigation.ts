/** Main navigation (plan §6). "Book" is a separate call to action in the header. */
export const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/music', label: 'Music' },
  { to: '/videos', label: 'Videos' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/events', label: 'Performances' },
  { to: '/contact', label: 'Contact' },
] as const;

export const BOOK_PATH = '/contact';
