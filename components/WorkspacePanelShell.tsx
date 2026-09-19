"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/shadcn_ui/button";
import { cn } from "@/lib/shadcn_utils";

export function WorkspacePanelShell({
  list,
  detail,
  showDetail,
  backLabel,
  onBack,
}: {
  list: ReactNode;
  detail: ReactNode;
  showDetail: boolean;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 md:grid-cols-[minmax(14rem,20%)_minmax(0,1fr)]">
      <div
        className={cn(
          "min-h-0 flex-col gap-2 rounded-sm border border-border/80 bg-surface-rail p-2",
          showDetail ? "hidden md:flex" : "flex",
        )}
      >
        {list}
      </div>

      <div
        className={cn(
          "min-h-0 flex-col overflow-hidden rounded-sm border border-border/80 bg-surface-panel shadow-sm",
          showDetail ? "flex" : "hidden md:flex",
        )}
      >
        {showDetail && (
          <div className="shrink-0 border-b border-border bg-surface-panel-header px-3 py-2 md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="font-mono text-xs gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to {backLabel}
            </Button>
          </div>
        )}
        {detail}
      </div>
    </div>
  );
}
