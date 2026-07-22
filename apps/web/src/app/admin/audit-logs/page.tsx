'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { DataTable } from '@/components/ui/DataTable';

export default function AuditLogsPage() {
  const { apiClient } = useAuth();
  const [page, setPage] = useState(1);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const res = await apiClient.get('/audit-logs', { params: { page, pageSize: 20 } });
      return res.data.data;
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit Logs</h1>
      <DataTable
        columns={[
          { key: 'createdAt', header: 'Date', render: (row: any) => new Date(row.createdAt).toLocaleString() },
          { key: 'user', header: 'User', render: (row: any) => row.user?.email ?? '—' },
          { key: 'action', header: 'Action' },
          { key: 'entityType', header: 'Entity' },
          { key: 'ipAddress', header: 'IP' },
        ]}
        rows={logsQuery.data?.items ?? []}
        page={page}
        pageSize={20}
        total={logsQuery.data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
