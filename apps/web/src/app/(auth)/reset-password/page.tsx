'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const token = params.get('token') ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/v1/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    if (res.ok) { toast.success('Password updated'); router.push('/login'); }
    else toast.error('Reset link invalid or expired');
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow dark:bg-gray-900">
      <h1 className="text-xl font-semibold">Reset password</h1>
      <input aria-label="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="New password" />
      <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Reset password</button>
    </form>
  );
}
