"use client";

import { useLayoutEffect } from "react";

/** Pixels per second; the old back-and-forth drift moved about this slowly. */
const SPEED = 3;

/**
 * Column heights depend on the screen, so a fixed CSS duration would make the
 * loop faster or slower per device. This sets each column's duration from its
 * real height so they all scroll at a gentle, constant speed.
 */
export function MuralSpeed({ factors }: { factors: number[] }) {
  useLayoutEffect(() => {
    function apply() {
      document
        .querySelectorAll<HTMLElement>(".mural-column")
        .forEach((column, index) => {
          // One loop moves half the column (one copy of its tiles).
          const distance = column.offsetHeight / 2;
          if (distance === 0) return; // hidden on this screen size
          const speed = SPEED * (factors[index] ?? 1);
          column.style.animationDuration = `${Math.round(distance / speed)}s`;
        });
    }
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [factors]);

  return null;
}
