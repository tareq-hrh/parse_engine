"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/shadcn_ui/button";

const SCROLL_SHOW_THRESHOLD = 240;

function getWindowScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function isScrollableElement(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  return target.scrollHeight > target.clientHeight;
}

export function GoToTopButton() {
  const [visible, setVisible] = useState(false);
  const activeScrollTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let animationFrameId: number | null = null;

    function updateVisibility(target: EventTarget | null) {
      const windowScrollTop = getWindowScrollTop();

      if (isScrollableElement(target) && target.scrollTop > 0) {
        activeScrollTargetRef.current = target;
        setVisible(target.scrollTop > SCROLL_SHOW_THRESHOLD || windowScrollTop > SCROLL_SHOW_THRESHOLD);
        return;
      }

      if (windowScrollTop > 0) {
        activeScrollTargetRef.current = null;
      }
      setVisible(windowScrollTop > SCROLL_SHOW_THRESHOLD);
    }

    function handleScroll(event: Event) {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        updateVisibility(event.target);
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  function handleClick() {
    const activeScrollTarget = activeScrollTargetRef.current;

    if (activeScrollTarget?.isConnected && activeScrollTarget.scrollTop > 0) {
      activeScrollTarget.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (getWindowScrollTop() > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon-lg"
      variant="outline"
      onClick={handleClick}
      aria-label="Scroll to top"
      title="Scroll to top"
      className="fixed bottom-4 left-4 z-50 rounded-full border-border bg-background/90 text-muted-foreground shadow-lg backdrop-blur hover:text-foreground sm:bottom-6 sm:left-6"
    >
      <ArrowUp className="size-4" />
    </Button>
  );
}
