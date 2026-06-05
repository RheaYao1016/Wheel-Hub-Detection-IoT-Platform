const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Reads the CSRF token from the cookie.
 * Returns null if no cookie is found.
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Adds the CSRF token to the request headers.
 * The token is read from the cookie and set as the X-CSRF-Token header.
 */
export function withCsrfHeader(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const csrfToken = getCsrfToken();

  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  return {
    ...init,
    headers,
  };
}

/**
 * Combines auth headers with CSRF header for secure API requests.
 */
export function withSecureHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const csrfToken = getCsrfToken();

  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  return {
    ...init,
    headers,
  };
}
