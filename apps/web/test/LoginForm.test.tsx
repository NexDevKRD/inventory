import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import LoginPage from '../src/app/(auth)/login/page';
import { AuthProvider } from '../src/lib/AuthContext';
import messages from '../src/i18n/messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('LoginPage', () => {
  it('shows validation error for invalid email', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </NextIntlClientProvider>
    );
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(screen.getByText(/invalid/i)).toBeInTheDocument());
  });
});
