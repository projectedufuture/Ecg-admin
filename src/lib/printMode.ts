"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/**
 * Print mode — a tiny store telling components "you are being printed now".
 *
 * Most print concerns are solved with CSS, but not all: `TechnicalDetails`
 * renders its body conditionally (`{open && …}`), so a collapsed section is
 * genuinely absent from the DOM and no stylesheet can reveal it. A report PDF
 * that silently omits data because a toggle happened to be shut is worse than
 * useless, so those sections are forced open while printing.
 *
 * The store is also driven by the browser's own `beforeprint` event, so Ctrl+P
 * produces exactly the same document as the Download PDF button.
 */

let printing = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return printing;
}

// Printing never happens during server rendering.
function getServerSnapshot() {
  return false;
}

export function setPrinting(next: boolean) {
  if (printing === next) return;
  printing = next;
  emit();
}

export function usePrintMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Wire the browser's print lifecycle once, on the client only.
//
// `beforeprint` fires immediately before the browser lays the page out for
// paper, and that layout is synchronous - a normal React state update would be
// scheduled too late and the first page would render with sections still
// collapsed. flushSync forces the re-render to complete inside the handler.
let wired = false;
if (typeof window !== "undefined" && !wired) {
  wired = true;
  window.addEventListener("beforeprint", () => {
    flushSync(() => setPrinting(true));
  });
  // Fires whether the dialog was completed or cancelled, so the screen always
  // returns to its normal collapsed state.
  window.addEventListener("afterprint", () => {
    setPrinting(false);
  });
}

/**
 * Open the print dialog with the page prepared for paper.
 *
 * Two animation frames pass before printing so React has committed the
 * expanded sections and the browser has laid them out. Without that wait the
 * captured document can be a frame behind.
 *
 * `documentName` becomes the suggested filename: browsers derive the default
 * name of a saved PDF from document.title, so without this the file lands as
 * whatever the tab happened to be called. The title is restored afterwards.
 */
export async function printPage(documentName?: string) {
  const previousTitle = document.title;
  if (documentName) document.title = documentName;

  setPrinting(true);
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

  try {
    window.print();
  } finally {
    // window.print() blocks until the dialog closes in most browsers, but not
    // all - restore on afterprint too so the tab title never stays changed.
    document.title = previousTitle;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
  }
}
