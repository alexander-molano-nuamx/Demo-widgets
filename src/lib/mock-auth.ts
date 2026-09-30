const MOCK_AUTH_KEY = "demo-tws-authenticated";

/**
 * Visual-only mock session for this prototype — no real credentials or backend involved.
 * Swap for a real provider (e.g. NextAuth + Azure AD, matching nuam's production Login) when needed.
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MOCK_AUTH_KEY) === "true";
}

export function setAuthenticated(value: boolean) {
  if (value) {
    window.localStorage.setItem(MOCK_AUTH_KEY, "true");
  } else {
    window.localStorage.removeItem(MOCK_AUTH_KEY);
  }
}
