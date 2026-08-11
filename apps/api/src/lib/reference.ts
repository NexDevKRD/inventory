import { prisma } from '../lib/prisma';

type Prefix = 'REQ' | 'PO' | 'DLV';

const TABLE = {
  REQ: 'request',
  PO: 'purchaseOrder',
  DLV: 'delivery',
} as const;

/**
 * Sequential human-readable reference (REQ-1001, PO-1002, …).
 *
 * ponytail: derives the next number from the current row count, which is fine at
 * this scale but can collide under truly concurrent creates. Swap for a Postgres
 * sequence if throughput ever makes that a real risk.
 */
export async function nextReference(prefix: Prefix): Promise<string> {
  const model = prisma[TABLE[prefix]] as { count: () => Promise<number> };
  const count = await model.count();
  return `${prefix}-${1001 + count}`;
}
