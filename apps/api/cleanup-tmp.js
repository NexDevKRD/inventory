require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { email: 'routes@example.com' } });
  if (u) {
    await p.passwordResetToken.deleteMany({ where: { userId: u.id } });
    await p.refreshToken.deleteMany({ where: { userId: u.id } });
    await p.auditLog.deleteMany({ where: { userId: u.id } });
    await p.userRole.deleteMany({ where: { userId: u.id } });
    await p.user.delete({ where: { id: u.id } });
    console.log('cleaned up', u.id);
  } else {
    console.log('no leftover user');
  }
  await p.$disconnect();
})();
