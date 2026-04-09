/**
 * H-15: Safe NextAuth redirect resolver.
 *
 * The previous NextAuth `redirect` callback used `url.startsWith("/")`
 * to detect "relative" URLs and prepend `baseUrl`. That's wrong:
 * `//attacker.com/path` also starts with "/" but resolves to the
 * attacker's origin under WHATWG URL parsing. Classic open redirect.
 *
 * This helper:
 *  - Parses the candidate URL properly (relative against baseUrl, or
 *    as absolute if it starts with a scheme)
 *  - Requires the resolved origin to equal baseUrl
 *  - Explicitly rejects any path that begins with `//`
 *  - Falls back to baseUrl on any parse error
 *
 * SECURITY_AUDIT.md §H-15
 */
export function safeRedirect(url: string, baseUrl: string): string {
  try {
    const parsed = url.startsWith("/")
      ? new URL(url, baseUrl)
      : new URL(url);

    if (parsed.origin !== baseUrl) return baseUrl;
    if (parsed.pathname.startsWith("//")) return baseUrl;
    return parsed.toString();
  } catch {
    return baseUrl;
  }
}
