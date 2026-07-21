'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, CreateUserInput } from '@inventory/shared';
import { Drawer } from '@/components/ui/Drawer';
import { FormField } from '@/components/ui/FormField';

export function UserFormDrawer({ open, onClose, roles, onSubmit }: { open: boolean; onClose: () => void; roles: { id: string; name: string }[]; onSubmit: (data: CreateUserInput) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema) });

  return (
    <Drawer open={open} onClose={onClose}>
      <form onSubmit={handleSubmit((data) => { onSubmit(data); onClose(); })} className="space-y-4">
        <h3 className="text-lg font-semibold">New user</h3>
        <FormField label="Email" error={errors.email?.message}><input {...register('email')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="First name" error={errors.firstName?.message}><input {...register('firstName')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="Last name" error={errors.lastName?.message}><input {...register('lastName')} className="w-full rounded border px-3 py-2" /></FormField>
        <FormField label="Role" error={errors.roleIds?.message}>
          <select multiple {...register('roleIds')} className="w-full rounded border px-3 py-2">
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FormField>
        <button type="submit" className="w-full rounded bg-active px-3 py-2 text-white">Create</button>
      </form>
    </Drawer>
  );
}
