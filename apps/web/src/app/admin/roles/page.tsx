'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { extractErrorMessage } from '@/lib/apiError';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Button';

// "user.create" -> group "User", label "Create"
function splitKey(key: string) {
  const [group, ...rest] = key.split('.');
  const label = (rest.join('.') || group).replace(/([A-Z])/g, ' $1');
  return {
    group: group.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
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
  const assignedIds = new Set<string>(role?.permissions?.map((rp: any) => rp.permission.id) ?? []);

  // Group permissions by their key prefix so long flat lists stay scannable.
  const grouped: Record<string, any[]> = {};
  for (const p of permissionsQuery.data ?? []) {
    const { group } = splitKey(p.key);
    (grouped[group] ??= []).push(p);
  }

  const toggle = (permissionId: string, checked: boolean) => {
    if (!role) return;
    const next = new Set(assignedIds);
    if (checked) next.add(permissionId);
    else next.delete(permissionId);
    setPermsMutation.mutate({ roleId: role.id, permissionIds: [...next] });
  };

  return (
    <>
      <PageHeader title="Roles & Permissions" description="Pick a role, then grant or revoke its permissions." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Role list */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-line bg-surface p-2 shadow-card">
            {rolesQuery.isLoading &&
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="m-1 h-9" />)}

            {rolesQuery.isError && (
              <EmptyState tone="danger" title="Couldn't load roles" description="Please refresh the page." />
            )}

            {rolesQuery.data?.map((r: any) => {
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ltr:text-left rtl:text-right ${
                    isSelected ? 'bg-active/10 font-medium text-active' : 'text-muted hover:bg-raised hover:text-ink'
                  }`}
                >
                  <span className="truncate">{r.name}</span>
                  {r.isSystem && (
                    <span className="shrink-0 rounded-full bg-raised px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-faint">
                      System
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Permission matrix */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-line bg-surface shadow-card">
            {!role ? (
              <EmptyState
                title="No role selected"
                description="Choose a role on the left to review and edit its permissions."
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{role.name}</h2>
                    <p className="text-xs text-muted">
                      {assignedIds.size} of {permissionsQuery.data?.length ?? 0} permissions granted
                    </p>
                  </div>
                  {setPermsMutation.isPending && (
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <Spinner className="h-3.5 w-3.5" />
                      Saving
                    </span>
                  )}
                </div>

                <div className="space-y-6 p-6">
                  {Object.entries(grouped).map(([group, perms]) => (
                    <fieldset key={group} className="space-y-2">
                      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">{group}</legend>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {perms.map((p: any) => {
                          const { label } = splitKey(p.key);
                          return (
                            <label
                              key={p.id}
                              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors duration-150 hover:bg-raised"
                            >
                              <input
                                type="checkbox"
                                // Controlled off the query data so a failed save reverts on refetch.
                                checked={assignedIds.has(p.id)}
                                disabled={setPermsMutation.isPending}
                                onChange={(e) => toggle(p.id, e.target.checked)}
                                className="h-4 w-4 shrink-0 cursor-pointer rounded border-line text-active accent-active disabled:cursor-not-allowed"
                              />
                              <span className="truncate">{label}</span>
                              <code className="ms-auto truncate text-[11px] text-faint">{p.key}</code>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
