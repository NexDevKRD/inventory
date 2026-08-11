'use client';
import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from '@/components/ui/AuthCard';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const token = params.get('token') ?? '';

  // Same flow, two entry points: /activate is a first-time password set.
  const isActivate = pathname.startsWith('/activate');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        toast.success(isActivate ? 'Account activated. Please log in.' : 'Password updated');
        router.push('/login');
      } else {
        toast.error('Reset link invalid or expired');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title={isActivate ? 'Activate your account' : 'Reset password'}
      description={
        isActivate
          ? 'Choose a password to finish setting up your account.'
          : 'Choose a new password for your account.'
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormField
          label="New password"
          error={error}
          hint="At least 8 characters."
          required
        >
          <input
            aria-label="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="field"
          />
        </FormField>
        <Button type="submit" className="w-full" loading={submitting}>
          {isActivate ? 'Activate account' : 'Reset password'}
        </Button>
      </form>
    </AuthCard>
  );
}
