'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

function extractErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.error?.message ?? fallback;
}

export default function RolesPage() {
  const { apiClient } = useAuth();
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return res.data.data;
    },
  });
  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/roles/permissions');
      return res.data.data;
    },
  });

  const setPermsMutation = useMutation({
    mutationFn: (vars: { roleId: string; permissionIds: string[] }) =>
      apiClient.patch(`/roles/${vars.roleId}/permissions`, { permissionIds: vars.permissionIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    onError: (err: any) => toast.error(extractErrorMessage(err, 'Failed to update permissions')),
  });

  const role = rolesQuery.data?.find((r: any) => r.id === selectedRole);
  const assignedKeys = new Set<string>(role?.permissions?.map((rp: any) => rp.permission.id) ?? []);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-1">
        <h1 className="mb-2 text-xl font-semibold">Roles</h1>
        {rolesQuery.data?.map((r: any) => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)} className={`block w-full rounded px-3 py-2 text-left text-sm ${selectedRole === r.id ? 'bg-active/10 text-active' : 'hover:bg-gray-100'}`}>
            {r.name}{r.isSystem && <span className="ml-2 text-xs text-gray-400">(system)</span>}
          </button>
        ))}
      </div>
      <div className="col-span-2">
        {role ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{role.name} permissions</h2>
            {permissionsQuery.data?.map((p: any) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={assignedKeys.has(p.id)}
                  onChange={(e) => {
                    const next = new Set(assignedKeys);
                    e.target.checked ? next.add(p.id) : next.delete(p.id);
                    setPermsMutation.mutate({ roleId: role.id, permissionIds: [...next] });
                  }}
                />
                {p.key}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Select a role to view its permissions.</p>
        )}
      </div>
    </div>
  );
}
