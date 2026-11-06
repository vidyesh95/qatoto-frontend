// TRANSPORT: props-only — pure string handling, plus one `window` read at the moment of a click.

/**
 * Where a visitor goes after signing in.
 *
 * THIS FILE IS THE WHOLE DEFENCE AGAINST AN OPEN REDIRECT, so nothing else in the app may read the
 * `next` parameter directly. `?next=` is attacker-writable: a link to
 * `qatoto.com/sign-in?next=//evil.example` must not end on another site with a visitor who just
 * trusted a real Qatoto sign-in page.
 */

export const RETURN_PATH_QUERY_KEY = "next";

const DEFAULT_RETURN_PATH = "/";

/** Never a real host. Parsing against it is how an off-site value is told apart from a path. */
const PLACEHOLDER_ORIGIN = "https://qatoto.invalid";

/** Returning to these would send a person who just signed in back to a sign-in form. */
const AUTH_PATH_PREFIXES = [
  "/sign-in",
  "/sign-in-with-password",
  "/sign-up",
  "/forgot-password",
] as const;

// Control characters are refused rather than stripped: the URL parser drops tabs and newlines, so
// "/\t/evil.example" would otherwise reach the checks below already rewritten to a scheme-relative
// address.
// oxlint-disable-next-line no-control-regex -- matching control characters is the point.
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

/**
 * Returns a same-site path, or `/` for anything else.
 *
 * Checked again AFTER parsing because normalization can create the shape it was meant to refuse:
 * `/.//evil.example` parses to the pathname `//evil.example`.
 */
export function readSafeReturnPath(rawReturnPath: unknown): string {
  if (typeof rawReturnPath !== "string") return DEFAULT_RETURN_PATH;
  if (
    !rawReturnPath.startsWith("/") ||
    rawReturnPath.startsWith("//") ||
    rawReturnPath.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(rawReturnPath)
  ) {
    return DEFAULT_RETURN_PATH;
  }

  let parsedReturnUrl: URL;
  try {
    parsedReturnUrl = new URL(rawReturnPath, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_RETURN_PATH;
  }

  if (parsedReturnUrl.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_RETURN_PATH;

  const { pathname, search, hash } = parsedReturnUrl;
  if (pathname.startsWith("//")) return DEFAULT_RETURN_PATH;
  if (
    AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return DEFAULT_RETURN_PATH;
  }
  return `${pathname}${search}${hash}`;
}

/** An auth route that carries the return path, or the bare route when there is nothing to carry. */
export function buildAuthHref(authRoute: string, returnPath: string): string {
  if (returnPath === DEFAULT_RETURN_PATH) return authRoute;
  return `${authRoute}?${RETURN_PATH_QUERY_KEY}=${encodeURIComponent(returnPath)}`;
}

/** Google and GitHub need an absolute address. Call from a click, never during render. */
export function buildSocialCallbackUrl(returnPath: string): string {
  return `${window.location.origin}${returnPath}`;
}
