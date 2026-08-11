'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { loginSchema, LoginInput } from '@inventory/shared';
import { useAuth } from '@/lib/AuthContext';
import { FormField } from '@/components/ui/FormField';
import { AuthCard } from '@/components/ui/AuthCard';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  INVENTORY_MANAGER: '/inventory/dashboard',
  INVENTORY_STAFF: '/inventory/dashboard',
  DOCTOR: '/doctor/dashboard',
  DELIVERY_STAFF: '/delivery/dashboard',
  SUPPLIER: '/supplier/dashboard',
};

export default function LoginPage() {
  const t = useTranslations('auth');
  const { login } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      const user = await login(data.email, data.password);
      router.push(ROLE_HOME[user.roles[0]] ?? '/admin/dashboard');
    } catch {
      toast.error('Invalid credentials or account locked');
    }
  };

  return (
    <AuthCard
      title={t('login')}
      description="Enter your credentials to access the platform."
      footer={
        <Link href="/forgot-password" className="font-medium text-active hover:underline">
          Forgot your password?
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label={t('email')} error={errors.email?.message} required>
          <input
            aria-label="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@hospital.org"
            className="field"
            {...register('email')}
          />
        </FormField>
        <FormField label={t('password')} error={errors.password?.message} required>
          <input
            aria-label="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="field"
            {...register('password')}
          />
        </FormField>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('login')}
        </Button>
      </form>
    </AuthCard>
  );
}
