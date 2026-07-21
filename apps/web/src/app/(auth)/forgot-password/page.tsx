'use client';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/v1/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setSent(true);
    toast.success('If that email exists, a reset link was sent.');
  };

  if (sent) return <p className="text-center">Check the server console for the reset link (dev mode).</p>;

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow dark:bg-gray-900">
      <h1 className="text-xl font-semibold">Forgot password</h1>
      <input aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Email" />
      <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Send reset link</button>
    </form>
  );
}
