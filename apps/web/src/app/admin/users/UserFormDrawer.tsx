'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, updateUserSchema, CreateUserInput, UpdateUserInput } from '@inventory/shared';
import { Drawer } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

interface UserFormDrawerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: { id: string }[];
  roleIds?: string[];
}

export function UserFormDrawer({
  open,
  onClose,
  roles,
  onSubmit,
  user,
  submitting = false,
}: {
  open: boolean;
  onClose: () => void;
  roles: { id: string; name: string }[];
  onSubmit: (data: CreateUserInput | UpdateUserInput) => void;
  user?: UserFormDrawerUser | null;
  submitting?: boolean;
}) {
  const isEdit = !!user;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    values: user
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          roleIds: user.roleIds ?? user.roles?.map((r) => r.id) ?? [],
        }
      : undefined,
  });

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit user' : 'New user'}>
      <form
        onSubmit={handleSubmit((data) => {
          onSubmit(data);
          onClose();
        })}
        className="flex h-full flex-col"
      >
        <div className="flex-1 space-y-5">
          {!isEdit && (
            <FormField label="Email" error={(errors as any).email?.message} required>
              <input type="email" autoComplete="off" placeholder="name@hospital.org" className="field" {...register('email' as any)} />
            </FormField>
          )}
          <FormField label="First name" error={errors.firstName?.message} required>
            <input defaultValue={user?.firstName} className="field" {...register('firstName')} />
          </FormField>
          <FormField label="Last name" error={errors.lastName?.message} required>
            <input defaultValue={user?.lastName} className="field" {...register('lastName')} />
          </FormField>
          <FormField
            label="Roles"
            error={errors.roleIds?.message}
            hint="Hold Ctrl (Cmd on Mac) to select more than one."
            required
          >
            <select
              multiple
              size={Math.min(Math.max(roles.length, 3), 6)}
              defaultValue={user?.roleIds ?? user?.roles?.map((r) => r.id)}
              className="field"
              {...register('roleIds')}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="rounded px-1 py-1">
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
          {!isEdit && (
            <p className="rounded-lg border border-line bg-raised/50 p-3 text-xs text-muted">
              A temporary password is generated and an activation link is sent to the new user.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
