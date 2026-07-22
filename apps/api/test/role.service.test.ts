import { roleService } from '../src/services/role.service';
import { prisma } from '../src/lib/prisma';
import { RoleName } from '@inventory/shared';

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

  it('rejects setPermissions on a nonexistent role', async () => {
    await expect(roleService.setPermissions('nonexistent-id', [], actorUserId)).rejects.toThrow();
  });

  it('allows setPermissions on a system role', async () => {
    const role = await prisma.role.upsert({
      where: { name: RoleName.DOCTOR },
      update: {},
      create: { name: RoleName.DOCTOR, isSystem: true },
    });
    expect(role.isSystem).toBe(true);
    const perms = await prisma.permission.findMany({ take: 1 });
    const result = await roleService.setPermissions(role.id, perms.map((p) => p.id), actorUserId);
    expect(result).toBeDefined();
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
