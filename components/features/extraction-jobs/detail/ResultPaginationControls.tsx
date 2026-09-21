import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/shadcn_ui/button";

import { getTotalPages } from "./resultPagination";

export function ResultPaginationControls({
  page,
  totalItems,
  pageSize,
  itemLabel,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const totalPages = getTotalPages(totalItems, pageSize);
  if (totalItems <= pageSize) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pluralLabel = totalItems === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="size-9 p-0"
          aria-label={`Go to previous ${itemLabel} page`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="size-9 p-0"
          aria-label={`Go to next ${itemLabel} page`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {totalItems} {pluralLabel} &middot; page {safePage} of {totalPages}
      </span>
    </div>
  );
}
