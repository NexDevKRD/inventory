import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from '../src/app/admin/users/page';

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ accessToken: 'x', user: { permissions: ['user.create'] } }) }));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: any[]) => toastError(...args), success: (...args: any[]) => toastSuccess(...args) } }));

const sampleUser = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', status: 'ACTIVE', roles: [{ id: 'r1' }] };

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function jsonResponse(body: any, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

describe('UsersPage', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  it('renders fetched users', async () => {
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/v1/roles')) return jsonResponse({ success: true, data: [] });
      return jsonResponse({ success: true, data: { items: [sampleUser], total: 1, page: 1, pageSize: 20 } });
    }) as any;

    renderWithClient(<UsersPage />);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());
  });

  it('edits a user via PATCH and refetches the list', async () => {
    const fetchMock = vi.fn((url: string, init?: any) => {
      if (url.includes('/api/v1/roles')) return jsonResponse({ success: true, data: [{ id: 'r1', name: 'Admin' }] });
      if (url.includes('/api/v1/users/1') && init?.method === 'PATCH') {
        return jsonResponse({ success: true, data: { ...sampleUser, firstName: 'Updated' } });
      }
      return jsonResponse({ success: true, data: { items: [sampleUser], total: 1, page: 1, pageSize: 20 } });
    });
    global.fetch = fetchMock as any;

    renderWithClient(<UsersPage />);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument());

    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([url, init]: any[]) => url.includes('/api/v1/users/1') && init?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
      const body = JSON.parse(patchCall![1].body);
      expect(body.firstName).toBe('Updated');
    });

    // refetch: GET /api/v1/users called again after the mutation invalidates the query
    await waitFor(() => {
      const getCalls = fetchMock.mock.calls.filter(([url, init]: any[]) => url.includes('/api/v1/users?') && !init?.method);
      expect(getCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows an error toast when create fails instead of silently succeeding', async () => {
    const fetchMock = vi.fn((url: string, init?: any) => {
      if (url.includes('/api/v1/roles')) return jsonResponse({ success: true, data: [{ id: 'r1', name: 'Admin' }] });
      if (url === '/api/v1/users' && init?.method === 'POST') {
        return jsonResponse({ success: false, error: { message: 'Email already exists' } }, false, 409);
      }
      return jsonResponse({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20 } });
    });
    global.fetch = fetchMock as any;

    renderWithClient(<UsersPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /new user/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^create$/i })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'r1' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Email already exists'));
  });
});
