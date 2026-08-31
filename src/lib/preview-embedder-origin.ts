export function isGrokEmbedderOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "grok.com" || host.endsWith(".grok.com")) return true;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
    return false;
  } catch {
    return false;
  }
}

export function isSandboxPreviewGuestHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}

export function resolveParentEmbedderOrigin(
  parentIsSelf: boolean,
  referrer: string,
  ancestorOrigin?: string | null,
  guestHostname: string = "",
): string | null {
  if (parentIsSelf) return null;
  for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) {
    try {
      const url = new URL(
        candidate.includes("://") ? candidate : `https://${candidate}`,
      );
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      if (isGrokEmbedderOrigin(url.origin)) return url.origin;
    } catch {
      // try next
    }
  }
  return null;
}
