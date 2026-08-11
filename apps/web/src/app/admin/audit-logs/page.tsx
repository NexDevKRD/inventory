'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';

const PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const { apiClient } = useAuth();
  const [page, setPage] = useState(1);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const res = await apiClient.get('/audit-logs', { params: { page, pageSize: PAGE_SIZE } });
      return res.data.data;
    },
  });

  return (
    <>
      <PageHeader title="Audit Logs" description="A read-only record of security-relevant actions." />
      <DataTable
        columns={[
          {
            key: 'createdAt',
            header: 'Date',
            render: (row: any) => (
              <span className="whitespace-nowrap tabular-nums text-muted">
                {new Date(row.createdAt).toLocaleString()}
              </span>
            ),
          },
          { key: 'user', header: 'User', render: (row: any) => row.user?.email ?? '—' },
          {
            key: 'action',
            header: 'Action',
            render: (row: any) => <code className="text-xs text-ink">{row.action}</code>,
          },
          { key: 'entityType', header: 'Entity', render: (row: any) => row.entityType ?? '—' },
          {
            key: 'ipAddress',
            header: 'IP',
            render: (row: any) => <span className="tabular-nums text-muted">{row.ipAddress ?? '—'}</span>,
          },
        ]}
        rows={logsQuery.data?.items ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={logsQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={logsQuery.isLoading}
        isError={logsQuery.isError}
        onRetry={() => logsQuery.refetch()}
        emptyTitle="No audit entries"
        emptyDescription="Actions will appear here as users work in the platform."
      />
    </>
  );
}
