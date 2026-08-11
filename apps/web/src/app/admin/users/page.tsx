'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { extractErrorMessage } from '@/lib/apiError';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import { UserFormDrawer } from './UserFormDrawer';

const PAGE_SIZE = 20;

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
      const res = await apiClient.get('/users', { params: { page, pageSize: PAGE_SIZE } });
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
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(extractErrorMessage(err, 'Failed to create user')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.patch(`/users/${id}`, data),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(extractErrorMessage(err, 'Failed to update user')),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('User deactivated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(extractErrorMessage(err, 'Failed to deactivate user')),
  });

  const openCreate = () => {
    setEditingUser(null);
    setDrawerOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts, assign roles, and deactivate access."
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            New user
          </Button>
        }
      />

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
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingUser(row);
                    setDrawerOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:text-danger"
                  onClick={() => setConfirmId(row.id)}
                >
                  Deactivate
                </Button>
              </div>
            ),
          },
        ]}
        rows={usersQuery.data?.items ?? []}
        page={page}
        pageSize={PAGE_SIZE}
        total={usersQuery.data?.total ?? 0}
        onPageChange={setPage}
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        onRetry={() => usersQuery.refetch()}
        emptyTitle="No users yet"
        emptyDescription="Create the first account to get started."
      />

      <UserFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingUser(null);
        }}
        roles={Array.isArray(rolesQuery.data) ? rolesQuery.data : []}
        user={editingUser}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data) => {
          if (editingUser) updateMutation.mutate({ id: editingUser.id, data });
          else createMutation.mutate(data);
        }}
      />

      <ConfirmDialog
        open={!!confirmId}
        title="Deactivate user?"
        description="They will no longer be able to log in. You can reactivate them later."
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
        onConfirm={() => {
          deactivateMutation.mutate(confirmId!);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </>
  );
}
