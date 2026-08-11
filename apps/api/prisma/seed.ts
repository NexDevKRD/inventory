import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { RoleName, PermissionKey, ROLE_PERMISSIONS } from '@inventory/shared';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'ChangeMe123!';

async function main() {
  // --- Permissions & roles -------------------------------------------------
  const permissions = await Promise.all(
    Object.values(PermissionKey).map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } }),
    ),
  );
  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name, isSystem: true } }),
    ),
  );
  const roleByName = new Map(roles.map((r) => [r.name, r]));

  // System roles are defined by ROLE_PERMISSIONS, so the seed reconciles them
  // exactly — re-running repairs drift instead of only adding what's missing.
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleByName.get(roleName)!;
    const wanted = keys.map((key) => permissionByKey.get(key)!.id);

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: wanted } },
    });
    for (const permissionId of wanted) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  // --- Users ---------------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  async function upsertUser(email: string, firstName: string, lastName: string, roleName: RoleName) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, firstName, lastName },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roleByName.get(roleName)!.id } },
      update: {},
      create: { userId: user.id, roleId: roleByName.get(roleName)!.id },
    });
    return user;
  }

  const admin = await upsertUser('admin@inventory.local', 'Super', 'Admin', RoleName.SUPER_ADMIN);
  const manager = await upsertUser('manager@inventory.local', 'Mara', 'Keller', RoleName.INVENTORY_MANAGER);
  await upsertUser('staff@inventory.local', 'Sam', 'Ortiz', RoleName.INVENTORY_STAFF);
  const doctor = await upsertUser('doctor@inventory.local', 'Dana', 'Reyes', RoleName.DOCTOR);
  const driver = await upsertUser('driver@inventory.local', 'Dee', 'Novak', RoleName.DELIVERY_STAFF);
  const supplierUser = await upsertUser('supplier@inventory.local', 'Sasha', 'Vogel', RoleName.SUPPLIER);

  // --- Catalogue -----------------------------------------------------------
  const categories = await Promise.all(
    [
      ['Consumables', 'Single-use clinical supplies'],
      ['Medication', 'Pharmaceutical stock'],
      ['Instruments', 'Reusable clinical instruments'],
      ['Protective Equipment', 'PPE and safety wear'],
    ].map(([name, description]) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name, description } }),
    ),
  );
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  const supplier = await prisma.supplier.upsert({
    where: { name: 'Meridian Medical Supply' },
    update: {},
    create: {
      name: 'Meridian Medical Supply',
      contactEmail: 'orders@meridian.example',
      contactPhone: '+1 555 0110',
      address: '4 Harbour Road, Springfield',
      userId: supplierUser.id,
    },
  });
  const supplier2 = await prisma.supplier.upsert({
    where: { name: 'Northline Pharma' },
    update: {},
    create: { name: 'Northline Pharma', contactEmail: 'sales@northline.example' },
  });

  const warehouseMain = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: { code: 'WH-MAIN', name: 'Main Store', location: 'Building A, Level 1' },
  });
  const warehouseWard = await prisma.warehouse.upsert({
    where: { code: 'WH-WARD' },
    update: {},
    create: { code: 'WH-WARD', name: 'Ward Store', location: 'Building C, Level 3' },
  });

  const productSpecs: [string, string, string, string, string, number, number][] = [
    ['SKU-1001', 'Nitrile Gloves (M)', 'Protective Equipment', 'Powder-free examination gloves', 'box', 8.5, 40],
    ['SKU-1002', 'Surgical Mask Type IIR', 'Protective Equipment', 'Fluid-resistant surgical mask', 'box', 12.0, 30],
    ['SKU-1003', 'Sterile Gauze 10x10', 'Consumables', 'Sterile absorbent gauze swabs', 'pack', 4.25, 60],
    ['SKU-1004', 'IV Cannula 20G', 'Consumables', 'Peripheral intravenous cannula', 'pack', 22.0, 25],
    ['SKU-1005', 'Paracetamol 500mg', 'Medication', 'Analgesic tablets, 100 per bottle', 'bottle', 6.75, 50],
    ['SKU-1006', 'Amoxicillin 250mg', 'Medication', 'Antibiotic capsules, 60 per bottle', 'bottle', 14.4, 35],
    ['SKU-1007', 'Digital Thermometer', 'Instruments', 'Infrared non-contact thermometer', 'unit', 39.9, 10],
    ['SKU-1008', 'Stainless Forceps', 'Instruments', 'Autoclavable dressing forceps', 'unit', 18.6, 12],
  ];

  const products = [];
  for (const [sku, name, categoryName, description, unit, unitPrice, reorderLevel] of productSpecs) {
    products.push(
      await prisma.product.upsert({
        where: { sku },
        update: {},
        create: {
          sku,
          name,
          description,
          unit,
          unitPrice: new Prisma.Decimal(unitPrice),
          reorderLevel,
          categoryId: categoryByName.get(categoryName)!.id,
          supplierId: categoryName === 'Medication' ? supplier2.id : supplier.id,
        },
      }),
    );
  }

  // --- Stock ---------------------------------------------------------------
  const day = 86_400_000;
  // Deliberately spans healthy, low, and out-of-stock levels so the dashboards
  // and reorder alerts have something real to show.
  const stockPlan: [number, string, number, string, number | null][] = [
    [0, warehouseMain.id, 180, 'B-2401', 240],
    [0, warehouseWard.id, 24, 'B-2402', 300],
    [1, warehouseMain.id, 15, 'B-2403', 120],
    [2, warehouseMain.id, 320, 'B-2404', 400],
    [3, warehouseMain.id, 0, 'B-2405', 180],
    [4, warehouseMain.id, 48, 'B-2406', 25],
    [4, warehouseWard.id, 60, 'B-2407', 90],
    [5, warehouseMain.id, 12, 'B-2408', 15],
    [6, warehouseMain.id, 26, 'B-2409', null],
    [7, warehouseMain.id, 9, 'B-2410', null],
  ];

  for (const [productIdx, warehouseId, quantity, batchNumber, expiryInDays] of stockPlan) {
    const product = products[productIdx];
    await prisma.stockItem.upsert({
      where: {
        productId_warehouseId_batchNumber: {
          productId: product.id,
          warehouseId,
          batchNumber: batchNumber as any,
        },
      },
      update: {},
      create: {
        productId: product.id,
        warehouseId,
        quantity,
        batchNumber: batchNumber ?? null,
        expiryDate: expiryInDays == null ? null : new Date(Date.now() + expiryInDays * day),
      },
    });
  }

  // --- A doctor request with a delivery ------------------------------------
  const existingRequest = await prisma.request.findFirst({ where: { reference: 'REQ-1001' } });
  if (!existingRequest) {
    const request = await prisma.request.create({
      data: {
        reference: 'REQ-1001',
        doctorId: doctor.id,
        warehouseId: warehouseWard.id,
        status: 'APPROVED',
        note: 'Ward restock for the week',
        reviewedById: manager.id,
        reviewedAt: new Date(),
        items: {
          create: [
            { productId: products[0].id, quantity: 4, approvedQuantity: 4 },
            { productId: products[2].id, quantity: 10, approvedQuantity: 8 },
          ],
        },
      },
    });

    await prisma.delivery.create({
      data: {
        reference: 'DLV-1001',
        requestId: request.id,
        assignedToId: driver.id,
        status: 'IN_TRANSIT',
        dispatchedAt: new Date(),
      },
    });
  }

  const pendingRequest = await prisma.request.findFirst({ where: { reference: 'REQ-1002' } });
  if (!pendingRequest) {
    await prisma.request.create({
      data: {
        reference: 'REQ-1002',
        doctorId: doctor.id,
        warehouseId: warehouseMain.id,
        status: 'PENDING',
        note: 'Urgent — clinic running low on cannulas',
        items: { create: [{ productId: products[3].id, quantity: 6 }] },
      },
    });
  }

  // --- A purchase order ----------------------------------------------------
  const existingPo = await prisma.purchaseOrder.findFirst({ where: { reference: 'PO-1001' } });
  if (!existingPo) {
    await prisma.purchaseOrder.create({
      data: {
        reference: 'PO-1001',
        supplierId: supplier.id,
        warehouseId: warehouseMain.id,
        status: 'SUBMITTED',
        createdById: manager.id,
        expectedAt: new Date(Date.now() + 7 * day),
        items: {
          create: [
            { productId: products[3].id, quantity: 100, unitPrice: new Prisma.Decimal(21.5) },
            { productId: products[1].id, quantity: 50, unitPrice: new Prisma.Decimal(11.4) },
          ],
        },
      },
    });
  }

  await prisma.notification.deleteMany({ where: { userId: admin.id, title: 'Welcome to Medical Inventory' } });
  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: 'Welcome to Medical Inventory',
      body: 'Seed data is loaded. Explore products, stock, requests and deliveries.',
      link: '/admin/dashboard',
    },
  });

  console.log(`Seed complete. Accounts (password: ${DEMO_PASSWORD}):`);
  for (const email of [
    'admin@inventory.local',
    'manager@inventory.local',
    'staff@inventory.local',
    'doctor@inventory.local',
    'driver@inventory.local',
    'supplier@inventory.local',
  ]) {
    console.log(`  ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
