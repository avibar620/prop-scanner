/**
 * Opens a `mailto:` URI using the hidden-anchor + click() pattern.
 *
 * Why an anchor element and not `window.location.href = mailto:...`?
 *  - On iOS Safari and some Chromium-based browsers, assigning location for a
 *    mailto: URL is silently dropped when not in a *direct* user-gesture frame
 *    (e.g. when called from inside `onClick={(e) => { e.preventDefault(); fn() }}`
 *    via a wrapper).
 *  - A synthesized `<a>.click()` preserves the gesture chain and is broadly
 *    compatible.
 *
 * Why `setTimeout(remove, 100)`?
 *  - Removing the element synchronously immediately after `.click()` can
 *    cancel the OS hand-off in some browsers (notably Safari). Deferring the
 *    DOM removal by ~100ms gives the browser time to forward the navigation
 *    to the registered mail handler before we tear down the node.
 */
export function triggerMailto(href: string): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("a");
  link.href = href;
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) link.parentNode.removeChild(link);
  }, 100);
}
