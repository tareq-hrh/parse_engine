"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/shadcn_ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn_ui/tooltip";
import { useTheme } from "@/components/app/ThemeProvider";
import { cn } from "@/lib/shadcn_utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const setMountedTrue = () => {
      setMounted(true);
    };
    setMountedTrue();
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={toggle}
            variant="outline"
            size="icon-sm"
            className={cn(
              "rounded-full border-none bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer",
              className,
            )}
            aria-label="Toggle theme"
          >
            {mounted &&
              (theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />)}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {mounted
            ? theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
            : "Toggle theme"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
