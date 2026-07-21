'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserFormDrawer } from './UserFormDrawer';

async function ensureOk(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }
  return response;
}

export default function UsersPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
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
    mutationFn: (data: any) => fetch('/api/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(data) }).then(ensureOk),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => toast.error(err?.message ?? 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetch(`/api/v1/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(data) }).then(ensureOk),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => toast.error(err?.message ?? 'Failed to update user'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }).then(ensureOk),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => toast.error(err?.message ?? 'Failed to deactivate user'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <button onClick={() => { setEditingUser(null); setDrawerOpen(true); }} className="rounded bg-active px-4 py-2 text-sm text-white">New user</button>
      </div>
      <DataTable
        columns={[
          { key: 'email', header: 'Email' },
          { key: 'firstName', header: 'First name' },
          { key: 'lastName', header: 'Last name' },
          { key: 'status', header: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
          {
            key: 'id',
            header: 'Actions',
            render: (row: any) => (
              <div className="flex gap-3">
                <button onClick={() => { setEditingUser(row); setDrawerOpen(true); }} className="text-sm text-active">Edit</button>
                <button onClick={() => setConfirmId(row.id)} className="text-sm text-danger">Deactivate</button>
              </div>
            ),
          },
        ]}
        rows={usersQuery.data?.items ?? []}
        page={page}
        pageSize={20}
        total={usersQuery.data?.total ?? 0}
        onPageChange={setPage}
      />
      <UserFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingUser(null); }}
        roles={Array.isArray(rolesQuery.data) ? rolesQuery.data : []}
        user={editingUser}
        onSubmit={(data) => {
          if (editingUser) updateMutation.mutate({ id: editingUser.id, data });
          else createMutation.mutate(data);
        }}
      />
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
