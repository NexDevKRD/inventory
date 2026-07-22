import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from '../src/app/admin/users/page';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiDelete = vi.fn();

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'x',
    user: { permissions: ['user.create'] },
    apiClient: { get: apiGet, post: apiPost, patch: apiPatch, delete: apiDelete },
  }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...args: any[]) => toastError(...args), success: (...args: any[]) => toastSuccess(...args) } }));

const sampleUser = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', status: 'ACTIVE', roles: [{ id: 'r1' }] };

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function axiosResponse(data: any) {
  return Promise.resolve({ data });
}

describe('UsersPage', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    apiDelete.mockReset();
  });

  it('renders fetched users', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/roles')) return axiosResponse({ success: true, data: [] });
      return axiosResponse({ success: true, data: { items: [sampleUser], total: 1, page: 1, pageSize: 20 } });
    });

    renderWithClient(<UsersPage />);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());
  });

  it('edits a user via PATCH and refetches the list', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/roles')) return axiosResponse({ success: true, data: [{ id: 'r1', name: 'Admin' }] });
      return axiosResponse({ success: true, data: { items: [sampleUser], total: 1, page: 1, pageSize: 20 } });
    });
    apiPatch.mockImplementation((url: string) => {
      if (url.includes('/users/1')) return axiosResponse({ success: true, data: { ...sampleUser, firstName: 'Updated' } });
      return Promise.reject(new Error('unexpected patch'));
    });

    renderWithClient(<UsersPage />);
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument());

    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      const patchCall = apiPatch.mock.calls.find(([url]: any[]) => url.includes('/users/1'));
      expect(patchCall).toBeTruthy();
      expect(patchCall![1].firstName).toBe('Updated');
    });

    // refetch: GET /users called again after the mutation invalidates the query
    await waitFor(() => {
      const getCalls = apiGet.mock.calls.filter(([url]: any[]) => url === '/users');
      expect(getCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows an error toast when create fails instead of silently succeeding', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.includes('/roles')) return axiosResponse({ success: true, data: [{ id: 'r1', name: 'Admin' }] });
      return axiosResponse({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20 } });
    });
    apiPost.mockImplementation(() =>
      Promise.reject({ response: { status: 409, data: { success: false, error: { message: 'Email already exists' } } } })
    );

    renderWithClient(<UsersPage />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());

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
