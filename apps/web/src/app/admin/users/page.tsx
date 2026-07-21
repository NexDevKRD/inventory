'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserFormDrawer } from './UserFormDrawer';

export default function UsersPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetch(`/api/v1/users?page=${page}&pageSize=20`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((r) => r.data),
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetch('/api/v1/roles', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <button onClick={() => setDrawerOpen(true)} className="rounded bg-active px-4 py-2 text-sm text-white">New user</button>
      </div>
      <DataTable
        columns={[
          { key: 'email', header: 'Email' },
          { key: 'firstName', header: 'First name' },
          { key: 'lastName', header: 'Last name' },
          { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
          { key: 'id', header: 'Actions', render: (row: any) => <button onClick={() => setConfirmId(row.id)} className="text-sm text-danger">Deactivate</button> },
        ]}
        rows={usersQuery.data?.items ?? []}
        page={page}
        pageSize={20}
        total={usersQuery.data?.total ?? 0}
        onPageChange={setPage}
      />
      <UserFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} roles={Array.isArray(rolesQuery.data) ? rolesQuery.data : []} onSubmit={(data) => createMutation.mutate(data)} />
      <ConfirmDialog
        open={!!confirmId}
        title="Deactivate user?"
        description="They will no longer be able to log in."
        onConfirm={() => { deactivateMutation.mutate(confirmId!); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
