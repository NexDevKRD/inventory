'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@inventory/shared';
import { useAuth } from '@/lib/AuthContext';
import { FormField } from '@/components/ui/FormField';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);
    } catch {
      toast.error('Invalid credentials or account locked');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow dark:bg-gray-900">
      <h1 className="text-xl font-semibold">Log in</h1>
      <FormField label="Email" error={errors.email?.message}>
        <input aria-label="email" {...register('email')} className="w-full rounded border px-3 py-2" />
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        <input aria-label="password" type="password" {...register('password')} className="w-full rounded border px-3 py-2" />
      </FormField>
      <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Log in</button>
      <a href="/forgot-password" className="block text-center text-sm text-active">Forgot password?</a>
    </form>
  );
}
