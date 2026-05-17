type PaginationStateArgs = {
  page: number;
  pageSize: number;
  totalItems: number;
};

export const ADMIN_POSTS_PAGE_SIZE = 20;
export const PUBLIC_POSTS_PAGE_SIZE = 10;

export function parsePageParam(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}

export function getPaginationState({ page, pageSize, totalItems }: PaginationStateArgs) {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const skip = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    skip,
    rangeStart: totalItems === 0 ? 0 : skip + 1,
    rangeEnd: totalItems === 0 ? 0 : Math.min(skip + pageSize, totalItems),
    hasPreviousPage: page > 1,
    hasNextPage: totalPages > 0 && page < totalPages,
  };
}

export function getLoadMorePaginationState({ page, pageSize, totalItems }: PaginationStateArgs) {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const take = page * pageSize;

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    take,
    visibleItems: Math.min(take, totalItems),
    hasPreviousPage: page > 1,
    hasNextPage: totalPages > 0 && page < totalPages,
  };
}
