/**
 * Opens a mailto: URI using the anchor-click pattern, which is more reliable
 * than `window.location.href = mailto:...` across browsers (especially on
 * iOS Safari and some Chrome configs where the location assignment can be
 * silently dropped on user-gesture-required pages).
 */
export function triggerMailto(href: string): void {
  if (typeof document === "undefined") return;
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
