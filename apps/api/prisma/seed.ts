import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { RoleName, PermissionKey } from '@inventory/shared';

const prisma = new PrismaClient();

async function main() {
  const permissions = await Promise.all(
    Object.values(PermissionKey).map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } })
    )
  );

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, isSystem: true },
      })
    )
  );

  const superAdminRole = roles.find((r) => r.name === RoleName.SUPER_ADMIN)!;
  await Promise.all(
    permissions.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: superAdminRole.id, permissionId: p.id },
      })
    )
  );

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.local' },
    update: {},
    create: {
      email: 'admin@inventory.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  console.log('Seed complete. Login: admin@inventory.local / ChangeMe123!');
}

main().finally(() => prisma.$disconnect());
