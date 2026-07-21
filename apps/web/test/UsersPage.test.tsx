import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from '../src/app/admin/users/page';

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ accessToken: 'x', user: { permissions: ['user.create'] } }) }));
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { items: [{ id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', status: 'ACTIVE', roles: [] }], total: 1, page: 1, pageSize: 20 } } ) })) as any;

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('UsersPage', () => {
  it('renders fetched users', async () => {
    renderWithClient(<UsersPage />);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());
  });
});
