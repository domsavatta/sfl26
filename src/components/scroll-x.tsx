"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal scroll container that fades its right edge while there's more
 * content to scroll to. iOS hides scrollbars until you scroll, so without a
 * cue a wide table just looks cut off.
 */
export default function ScrollX({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [moreRight, setMoreRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setMoreRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      {/* relative: absolutely positioned content (e.g. sr-only text) must be
          contained by the scroller, or it widens the page. */}
      <div ref={ref} className="relative overflow-x-auto">
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-white dark:from-zinc-900 to-transparent transition-opacity ${
          moreRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
