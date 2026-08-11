'use client';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { extractErrorMessage } from './apiError';

/** GET helper — unwraps the `{ success, data }` envelope. */
export function useApiQuery<T = any>(
  key: unknown[],
  path: string,
  params?: Record<string, unknown>,
  options?: Partial<UseQueryOptions<T>>,
) {
  const { apiClient } = useAuth();
  return useQuery<T>({
    queryKey: [...key, params ?? null],
    queryFn: async () => {
      const res = await apiClient.get(path, { params });
      return res.data.data;
    },
    ...(options as any),
  });
}

/**
 * Mutation helper wiring the two things every write in this app needs:
 * a success toast + cache invalidation, and an error toast carrying the
 * API's message rather than a generic failure.
 */
export function useApiMutation<TVars = any, TData = any>(opts: {
  mutationFn: (client: ReturnType<typeof useAuth>['apiClient'], vars: TVars) => Promise<TData>;
  invalidate?: unknown[][];
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData) => void;
}) {
  const { apiClient } = useAuth();
  const qc = useQueryClient();

  return useMutation<TData, unknown, TVars>({
    mutationFn: (vars) => opts.mutationFn(apiClient, vars),
    onSuccess: (data) => {
      if (opts.successMessage) toast.success(opts.successMessage);
      for (const key of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: key });
      opts.onSuccess?.(data);
    },
    onError: (err) => toast.error(extractErrorMessage(err, opts.errorMessage ?? 'Something went wrong')),
  });
}

export const money = (value: unknown) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value ?? 0));

export const dateOnly = (value: unknown) =>
  value ? new Date(value as string).toLocaleDateString() : '—';
