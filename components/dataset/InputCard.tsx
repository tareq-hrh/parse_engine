"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchDatasetInputContent,
  getDatasetInputContentErrorMessage,
} from "@/lib/datasetInputContentClient";
import { DatasetInput } from "./types";
import { ScrollArea } from "../shadcn_ui/scroll-area";

export function InputCard({ input }: { input: DatasetInput }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    // Fetch content on first expand
    if (content === null) {
      setLoading(true);
      setContentError(null);
      try {
        setContent(await fetchDatasetInputContent(input.id));
      } catch (error) {
        setContentError(getDatasetInputContentErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    setExpanded(true);
  }

  return (
    <div className="border border-border rounded-sm bg-background p-2.5 space-y-2">
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-foreground truncate flex-1">{input.label}</span>
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {new Date(input.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* ── Toggle button ───────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading...
          </span>
        ) : expanded ? (
          "Hide content"
        ) : (
          "Show content"
        )}
      </button>

      {/* ── Content window ──────────────────────────────────────────────── */}
      {expanded && content !== null && (
        <ScrollArea className="h-48 overflow-y-auto font-mono text-[10px] text-foreground bg-muted/30 border border-border rounded-sm p-2 whitespace-pre-wrap break-all">
          {content}
        </ScrollArea>
      )}

      {expanded && contentError && (
        <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-2 font-mono text-[10px] text-destructive">
          {contentError}
        </div>
      )}
    </div>
  );
}
