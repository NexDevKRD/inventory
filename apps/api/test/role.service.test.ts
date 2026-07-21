import { roleService } from '../src/services/role.service';
import { prisma } from '../src/lib/prisma';

describe('roleService', () => {
  let actorUserId: string;
  let createdRoleId: string | undefined;

  beforeAll(async () => {
    const actor = await prisma.user.upsert({
      where: { email: 'role.svc.actor@example.com' },
      update: {},
      create: { email: 'role.svc.actor@example.com', passwordHash: 'x', firstName: 'Actor', lastName: 'RoleSvc' },
    });
    actorUserId = actor.id;
  });

  afterAll(async () => {
    if (createdRoleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId: createdRoleId } });
      await prisma.role.delete({ where: { id: createdRoleId } }).catch(() => {});
    }
    if (actorUserId) {
      await prisma.auditLog.deleteMany({ where: { userId: actorUserId } });
      await prisma.user.delete({ where: { id: actorUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('rejects deleting/renaming a system role via setPermissions on nonexistent role', async () => {
    await expect(roleService.setPermissions('nonexistent-id', [], actorUserId)).rejects.toThrow();
  });

  it('creates a custom role and assigns permissions', async () => {
    const perms = await prisma.permission.findMany({ take: 1 });
    const role = await roleService.create({ name: 'CUSTOM_ROLE_TEST', description: 'test' }, actorUserId);
    createdRoleId = role.id;
    const updated = await roleService.setPermissions(role.id, perms.map((p) => p.id), actorUserId);
    expect(updated).toBeDefined();
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.role.delete({ where: { id: role.id } });
    createdRoleId = undefined;
  });
});
