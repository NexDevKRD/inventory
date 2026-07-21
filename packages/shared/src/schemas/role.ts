import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
});
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
