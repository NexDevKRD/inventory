import { userService } from '../src/services/user.service';
import { prisma } from '../src/lib/prisma';
import { RoleName } from '@inventory/shared';

describe('userService', () => {
  let roleId: string;
  let createdId: string;
  let actorUserId: string;

  beforeAll(async () => {
    const role = await prisma.role.upsert({ where: { name: RoleName.DOCTOR }, update: {}, create: { name: RoleName.DOCTOR, isSystem: true } });
    roleId = role.id;

    const actor = await prisma.user.upsert({
      where: { email: 'svc.actor@example.com' },
      update: {},
      create: { email: 'svc.actor@example.com', passwordHash: 'x', firstName: 'Actor', lastName: 'Admin' },
    });
    actorUserId = actor.id;
  });

  afterAll(async () => {
    if (createdId) await prisma.userRole.deleteMany({ where: { userId: createdId } });
    if (createdId) await prisma.user.delete({ where: { id: createdId } }).catch(() => {});
    if (actorUserId) await prisma.auditLog.deleteMany({ where: { userId: actorUserId } });
    if (actorUserId) await prisma.user.delete({ where: { id: actorUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('creates a user with a temporary password and assigned role', async () => {
    const user = await userService.create({ email: 'svc.user@example.com', firstName: 'S', lastName: 'U', roleIds: [roleId] }, actorUserId);
    createdId = user.id;
    expect(user.email).toBe('svc.user@example.com');
  });

  it('excludes soft-deleted users from list()', async () => {
    await userService.deactivate(createdId, actorUserId);
    const { items } = await userService.list({ page: 1, pageSize: 20 });
    expect(items.find((u) => u.id === createdId)).toBeUndefined();
  });
});
