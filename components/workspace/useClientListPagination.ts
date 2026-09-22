"use client";

import { useMemo, useState } from "react";

export function useClientListPagination<T>({
  items,
  pageSize,
}: {
  items: T[];
  pageSize: number;
}) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, pageSize, safePage]);

  function setSafePage(nextPage: number) {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    setPage: setSafePage,
  };
}
