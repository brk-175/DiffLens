const ACCESS_TOKEN_KEY = "difflens_access_token";
const GUEST_REVIEW_TOKEN_MAP_KEY = "difflens_guest_review_tokens";


type GuestTokenMap = Record<string, string>;

function safeParseGuestMap(raw: string | null): GuestTokenMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as GuestTokenMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getGuestTokenMap(): GuestTokenMap {
  if (typeof window === "undefined") return {};
  return safeParseGuestMap(localStorage.getItem(GUEST_REVIEW_TOKEN_MAP_KEY));
}

export function getGuestTokenForReview(reviewId: number): string | null {
  const map = getGuestTokenMap();
  return map[String(reviewId)] ?? null;
}

export function saveGuestToken(reviewId: number, guestToken: string): void {
  if (typeof window === "undefined") return;
  const current = getGuestTokenMap();
  current[String(reviewId)] = guestToken;
  localStorage.setItem(GUEST_REVIEW_TOKEN_MAP_KEY, JSON.stringify(current));
}

export function getGuestTokenList(): string[] {
  const values = Object.values(getGuestTokenMap())
    .map((v) => v.trim())
    .filter(Boolean);

  return Array.from(new Set(values));
}

export function clearGuestTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_REVIEW_TOKEN_MAP_KEY);
}

export async function linkGuestReviews(apiBase: string, accessToken: string): Promise<number> {
  const guestTokens = getGuestTokenList();
  if (!guestTokens.length) return 0;

  const res = await fetch(`${apiBase}/auth/link-guest-reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ guest_tokens: guestTokens }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to link guest reviews.");
  }

  const data = (await res.json()) as { linked_count: number };
  clearGuestTokens();
  return data.linked_count ?? 0;
}
