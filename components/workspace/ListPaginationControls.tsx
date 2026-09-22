import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/shadcn_ui/button";

export function ListPaginationControls({
  page,
  totalItems,
  totalPages,
  itemLabel,
  isFetching = false,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  totalPages: number;
  itemLabel: string;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pluralLabel = totalItems === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div className="flex shrink-0 items-center gap-2 pt-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="size-9 p-0"
          aria-label={`Go to previous ${itemLabel} page`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-9 p-0"
          aria-label={`Go to next ${itemLabel} page`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
      <span className=" flex flex-col gap-1 font-mono text-[11px] text-muted-foreground">
        <span>
          {totalItems} {pluralLabel}
        </span>
        <span>
          page {page} of {totalPages}
        </span>
        {isFetching && <> &middot; loading</>}
      </span>
    </div>
  );
}
