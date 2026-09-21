"use client";

import type { ReactNode } from "react";
import { Check, ChevronsUpDown, Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/shadcn_ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shadcn_ui/command";
import { Label } from "@/components/shadcn_ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn_ui/popover";
import { cn } from "@/lib/shadcn_utils";
import { useState } from "react";

export function SearchablePicker<T>({
  id,
  label,
  required,
  value,
  items,
  loading,
  error,
  emptyMessage,
  placeholder,
  searchPlaceholder,
  fieldError,
  onRetry,
  onValueChange,
  getValue,
  getKeywords,
  renderItem,
  renderSelected,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  items: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage: ReactNode;
  placeholder: string;
  searchPlaceholder: string;
  fieldError?: string;
  onRetry?: () => void;
  onValueChange: (value: string) => void;
  getValue: (item: T) => string;
  getKeywords: (item: T) => string[];
  renderItem: (item: T, selected: boolean) => ReactNode;
  renderSelected: (item: T) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => getValue(item) === value) ?? null;
  const hasItems = items.length > 0;
  const disabled = loading || Boolean(error) || !hasItems;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-mono text-xs uppercase tracking-wider">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={fieldError ? "true" : undefined}
            disabled={disabled}
            className={cn(
              "h-auto min-h-11 w-full justify-between gap-3 rounded-sm border-border bg-surface-raised px-3 py-2 text-left font-mono text-sm hover:bg-muted",
              !selectedItem && "text-muted-foreground",
              fieldError && "border-destructive/60 ring-2 ring-destructive/10",
            )}
          >
            <span className="min-w-0 flex-1">
              {selectedItem ? renderSelected(selectedItem) : placeholder}
            </span>
            {loading ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(42rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
        >
          <Command loop>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>No matches found.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => {
                  const itemValue = getValue(item);
                  const selected = itemValue === value;

                  return (
                    <CommandItem
                      key={itemValue}
                      value={itemValue}
                      keywords={getKeywords(item)}
                      onSelect={() => {
                        onValueChange(itemValue);
                        setOpen(false);
                      }}
                      className="items-start"
                    >
                      <div className="min-w-0 flex-1">{renderItem(item, selected)}</div>
                      <Check
                        className={cn(
                          "mt-1 size-4 shrink-0 text-blue-400",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {loading && (
        <p className="font-mono text-[11px] text-muted-foreground">Loading {label.toLowerCase()}...</p>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2">
          <p className="font-mono text-xs text-destructive">{error}</p>
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 shrink-0 gap-1 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCcw className="size-3" />
              Retry
            </Button>
          )}
        </div>
      )}

      {!loading && !error && !hasItems && (
        <div className="font-mono text-xs text-muted-foreground">{emptyMessage}</div>
      )}

      {fieldError && <p className="font-mono text-xs text-destructive">{fieldError}</p>}
    </div>
  );
}
