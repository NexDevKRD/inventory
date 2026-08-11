export interface PageParams {
  page: number;
  pageSize: number;
}

/** Clamps user-supplied paging so a bad query can't ask for the whole table. */
export function toSkipTake(query: { page?: unknown; pageSize?: unknown }) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paged<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize };
}
