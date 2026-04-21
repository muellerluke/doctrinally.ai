"use client";

import { useLayoutEffect } from "react";

/**
 * Member-facing chat renders in a single theme: the church's configured
 * colors if Enterprise, the Doctrinally.AI default otherwise. This strips
 * the `.dark` class from `<html>` so shadcn's `dark:` utilities don't flip
 * UI based on the viewer's OS preference. Uses `useLayoutEffect` so the
 * removal happens before paint and there's no dark-mode flash.
 */
export function ForceSingleTheme() {
  useLayoutEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return null;
}
