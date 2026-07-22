'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserFormDrawer } from './UserFormDrawer';

function extractErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.error?.message ?? fallback;
}

export default function UsersPage() {
  const { apiClient } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', page],
    queryFn: async () => {
      const res = await apiClient.get('/users', { params: { page, pageSize: 20 } });
      return res.data.data;
    },
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => toast.error(extractErrorMessage(err, 'Failed to create user')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => toast.error(extractErrorMessage(err, 'Failed to update user')),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => toast.error(extractErrorMessage(err, 'Failed to deactivate user')),
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
