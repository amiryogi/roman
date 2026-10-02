import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

import { BOOK_PATH, NAV_ITEMS } from './navigation';
import { Wordmark } from './Wordmark';

/**
 * Full-screen menu for phones and tablets (plan §7.4, §18). A modal <dialog> makes the rest of
 * the page inert, keeps focus inside and closes on Esc. Focus returns to the Menu button, except
 * after choosing a page, when the new page's heading receives it instead.
 */
export function MobileNav({ className }: { className?: string }) {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navigatingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close when the page changes (e.g. browser back while the menu is open).
  useEffect(() => {
    if (dialogRef.current?.open) {
      navigatingRef.current = true;
      dialogRef.current.close();
    }
  }, [pathname]);

  function openMenu() {
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function closeMenu(forNavigation: boolean) {
    navigatingRef.current = forNavigation;
    dialogRef.current?.close();
  }

  /** Choosing the page you're already on doesn't navigate, so focus goes back to Menu. */
  function closeFor(to: string) {
    closeMenu(to !== pathname);
  }

  function handleClose() {
    setOpen(false);
    if (!navigatingRef.current) toggleRef.current?.focus();
    navigatingRef.current = false;
  }

  return (
    <div className={className}>
      <button
        ref={toggleRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={openMenu}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 label-caps"
      >
        Menu
      </button>

      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Site menu"
        onClose={handleClose}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto surface-dark p-0 backdrop:bg-ebony"
      >
        <Container className="flex min-h-full flex-col">
          <div className="flex h-16 items-center justify-between gap-6 sm:h-20">
            <Wordmark
              onClick={() => {
                closeFor('/');
              }}
            />
            <button
              type="button"
              onClick={() => {
                closeMenu(false);
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 label-caps"
            >
              Close
            </button>
          </div>

          <nav aria-label="Main" className="flex-1 py-10">
            <ul className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => {
                      closeFor(item.to);
                    }}
                    className="inline-flex min-h-14 items-center font-display text-[2.25rem] leading-none text-(--muted) transition-colors hover:text-ivory aria-[current=page]:text-ivory"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="pb-10">
            <ButtonLink
              to={BOOK_PATH}
              onClick={() => {
                closeFor(BOOK_PATH);
              }}
              className="w-full sm:w-auto"
            >
              Book Roman
            </ButtonLink>
          </div>
        </Container>
      </dialog>
    </div>
  );
}
