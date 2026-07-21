import { prisma } from '../lib/prisma';

export const roleRepository = {
  findByName(name: string) {
    return prisma.role.findUnique({ where: { name }, include: { permissions: { include: { permission: true } } } });
  },
  findById(id: string) {
    return prisma.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } } } });
  },
  list() {
    return prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
  },
  create(data: { name: string; description?: string }) {
    return prisma.role.create({ data });
  },
  setPermissions(roleId: string, permissionIds: string[]) {
    return prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId, permissionId })) }),
    ]);
  },
  allPermissions() {
    return prisma.permission.findMany();
  },
};
