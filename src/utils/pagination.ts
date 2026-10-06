export interface PaginationResult<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export function parseCursorLimit(cursorRaw?: any, limitRaw?: any) {
  let limit = parseInt(limitRaw, 10);
  if (isNaN(limit) || limit < 1) limit = 10;
  if (limit > 10) limit = 10;

  const cursor = cursorRaw ? BigInt(cursorRaw) : undefined;
  
  return { cursor, limit };
}

export function formatPaginatedResponse<T extends { id: bigint | string }>(
  items: T[], 
  limit: number
): PaginationResult<T> {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, -1) : items;
  const nextCursor = data.length > 0 ? data[data.length - 1].id.toString() : null;

  return {
    data,
    meta: {
      nextCursor,
      hasNextPage
    }
  };
}
