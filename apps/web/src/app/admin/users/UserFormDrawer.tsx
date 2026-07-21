'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, updateUserSchema, CreateUserInput, UpdateUserInput } from '@inventory/shared';
import { Drawer } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';

interface UserFormDrawerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: { id: string }[];
  roleIds?: string[];
}

export function UserFormDrawer({ open, onClose, roles, onSubmit, user }: { open: boolean; onClose: () => void; roles: { id: string; name: string }[]; onSubmit: (data: CreateUserInput | UpdateUserInput) => void; user?: UserFormDrawerUser | null }) {
  const isEdit = !!user;
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserInput | UpdateUserInput>({
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
    <Drawer open={open} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => { onSubmit(data); onClose(); })} className="space-y-4">
        <h3 className="text-lg font-semibold">{isEdit ? 'Edit user' : 'New user'}</h3>
        {!isEdit && (
          <FormField label="Email" error={(errors as any).email?.message}><input {...register('email' as any)} className="w-full rounded border px-3 py-2" /></FormField>
        )}
        <FormField label="First name" error={errors.firstName?.message}><input defaultValue={user?.firstName} {...register('firstName')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="Last name" error={errors.lastName?.message}><input defaultValue={user?.lastName} {...register('lastName')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="Role" error={errors.roleIds?.message}>
          <select multiple defaultValue={user?.roleIds ?? user?.roles?.map((r) => r.id)} {...register('roleIds')} className="w-full rounded border px-3 py-2">
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FormField>
        <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">{isEdit ? 'Save' : 'Create'}</button>
      </form>
    </Drawer>
  );
}
