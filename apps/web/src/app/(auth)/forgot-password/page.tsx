'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from '@/components/ui/AuthCard';
import { Button } from '@/components/ui/Button';
import { InboxIcon } from '@/components/ui/icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="Check your inbox"
        footer={
          <Link href="/login" className="font-medium text-active hover:underline">
            Back to log in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <InboxIcon className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted">
            If an account exists for <span className="font-medium text-ink">{email}</span>, a reset link is on its way.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      description="We'll send a reset link to your registered email address."
      footer={
        <Link href="/login" className="font-medium text-active hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Email" required>
          <input
            aria-label="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hospital.org"
            className="field"
          />
        </FormField>
        <Button type="submit" className="w-full" loading={submitting}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
