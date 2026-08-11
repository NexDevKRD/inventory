import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export const favouriteService = {
  async list(userId: string) {
    const rows = await prisma.favourite.findMany({
      where: { userId, product: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            stockItems: { select: { quantity: true } },
          },
        },
      },
    });

    return rows.map(({ product, createdAt }) => {
      const { stockItems, ...rest } = product;
      return {
        ...rest,
        createdAt,
        totalStock: stockItems.reduce((sum, s) => sum + s.quantity, 0),
      };
    });
  },

  async add(userId: string, productId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundError('Product not found');
    return prisma.favourite.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
  },

  async remove(userId: string, productId: string) {
    await prisma.favourite.deleteMany({ where: { userId, productId } });
  },
};
