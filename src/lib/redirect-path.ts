/**
 * A path on this site to send the player to after signing in, from the
 * `next` value of the sign-in page. Anything that isn't a plain path on this
 * site (e.g. "https://evil.example" or "//evil.example") falls back, so the
 * sign-in page can't be used to redirect people to another site.
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  const base = "http://localhost";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return fallback;
  }
  // "//host", "/\host" and paths with tabs or newlines can resolve elsewhere.
  if (url.origin !== base) return fallback;
  // Coming back to the sign-in page itself isn't useful.
  if (url.pathname === "/sign-in") return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The sign-in page URL that returns to `path` afterwards. */
export function signInHref(path: string) {
  const next = safeRedirectPath(path, "");
  return next && next !== "/"
    ? `/sign-in?next=${encodeURIComponent(next)}`
    : "/sign-in";
}
