import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { LoginInput } from '@roman/shared';

import { ApiClientError } from '@/lib/api/client';

import { AuthContext, type AuthContextValue, type AuthState } from './AuthContext';
import { LoginPage } from './LoginPage';
import { RequireAuth } from './RequireAuth';
import { safeNextPath } from './safeNextPath';

const ADMIN = { id: '64b7f0c2a1b2c3d4e5f60718', email: 'owner@example.com', name: 'Owner' };

function renderAdmin(
  path: string,
  state: AuthState,
  login: AuthContextValue['login'] = vi.fn<(input: LoginInput) => Promise<void>>(),
) {
  const router = createMemoryRouter(
    [
      { path: '/admin/login', element: <LoginPage /> },
      {
        path: '/admin/*',
        element: (
          <RequireAuth>
            <p>Admin content</p>
          </RequireAuth>
        ),
      },
      { path: '/admin/after', element: <p>Arrived</p> },
    ],
    { initialEntries: [path] },
  );
  const value: AuthContextValue = { state, login, logout: vi.fn() };
  render(
    <AuthContext value={value}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
  return router;
}

describe('RequireAuth', () => {
  it('redirects anonymous visitors to the login page, remembering where they were going', () => {
    const router = renderAdmin('/admin/account?tab=1', { status: 'anonymous' });

    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(router.state.location.search).toBe(
      `?next=${encodeURIComponent('/admin/account?tab=1')}`,
    );
  });

  it('shows a status message while the session is being restored', () => {
    renderAdmin('/admin', { status: 'loading' });

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders protected content for a signed-in admin', () => {
    renderAdmin('/admin', { status: 'authenticated', admin: ADMIN });

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('validates the fields before calling the API', async () => {
    const login = vi.fn<(input: LoginInput) => Promise<void>>();
    renderAdmin('/admin/login', { status: 'anonymous' }, login);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  it('signs in and continues to the requested page', async () => {
    const login = vi.fn<(input: LoginInput) => Promise<void>>().mockResolvedValue();
    const router = renderAdmin(
      '/admin/login?next=%2Fadmin%2Fafter',
      { status: 'anonymous' },
      login,
    );

    await userEvent.type(screen.getByLabelText('Email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'a long test password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'a long test password',
    });
    expect(await screen.findByText('Arrived')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/after');
  });

  it('shows the server message when sign-in fails', async () => {
    const login = vi
      .fn<(input: LoginInput) => Promise<void>>()
      .mockRejectedValue(
        new ApiClientError(401, 'UNAUTHENTICATED', 'Incorrect email or password.'),
      );
    renderAdmin('/admin/login', { status: 'anonymous' }, login);

    await userEvent.type(screen.getByLabelText('Email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });
});

describe('safeNextPath', () => {
  it.each([
    [null, '/admin'],
    ['/admin/account', '/admin/account'],
    ['https://evil.example', '/admin'],
    ['//evil.example', '/admin'],
    ['/admin/login?next=x', '/admin'],
    ['/', '/admin'],
  ])('%s → %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
