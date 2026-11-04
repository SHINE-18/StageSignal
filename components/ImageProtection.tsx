"use client";

import { useEffect } from "react";

/**
 * Image Protection Defaults
 * Blocks contextmenu and dragstart on images ONLY (never on text, buttons, links, or whole document).
 * Modular and toggleable via enabled prop.
 */
export function ImageProtection({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "IMG") {
        e.preventDefault();
      }
    }

    function handleDragStart(e: DragEvent) {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "IMG") {
        e.preventDefault();
      }
    }

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [enabled]);

  return null;
}

