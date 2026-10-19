/**
 * OpenF1 server client for admin-only historical radio browsing.
 * Uses optional paid credentials, bounded in-process caching, Next fetch cache,
 * in-flight request de-duplication and a 429 cooldown. No tokens are exposed
 * to browser code or returned in API responses.
 */
export type OpenF1Resource = "meetings" | "sessions" | "drivers" | "team_radio";

export class OpenF1RateLimitError extends Error {
  readonly retryAfter: number;
  constructor(retryAfter: number) {
    super(`OpenF1 istek sınırına ulaşıldı. Yaklaşık ${retryAfter} saniye sonra yeniden deneyin.`);
    this.name = "OpenF1RateLimitError";
    this.retryAfter = retryAfter;
  }
}

type CacheEntry = { expires: number; items: object[] };
const resultsCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<object[]>>();
const MAX_CACHED_QUERIES = 96;
const DATA_CACHE_MS = 2 * 60 * 60 * 1000;
let blockedUntil = 0;

let tokenState: { value: string | null; until: number } | null = null;
let tokenPending: Promise<string | null> | null = null;

function getRetrySeconds(header: string | null): number {
  if (header) {
    const number = Number(header);
    if (Number.isFinite(number) && number > 0) return Math.max(1, Math.min(600, Math.ceil(number)));
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(1, Math.min(600, Math.ceil((date - Date.now()) / 1000)));
  }
  return 60;
}

async function getOptionalPaidToken(): Promise<string | null> {
  const username = process.env.OPENF1_USERNAME?.trim();
  const password = process.env.OPENF1_PASSWORD?.trim();
  if (!username || !password) return null;
  if (tokenState && Date.now() < tokenState.until) return tokenState.value;
  if (tokenPending) return tokenPending;

  tokenPending = (async () => {
    try {
      const response = await fetch("https://api.openf1.org/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        // Keep historical searches available at public-tier limits if credentials fail.
        console.warn("OPENF1 RADIO: authenticated token unavailable; using public historical access.");
        tokenState = { value: null, until: Date.now() + 2 * 60 * 1000 };
        return null;
      }
      const content: unknown = await response.json();
      if (!content || typeof content !== "object" || !("access_token" in content) || typeof content.access_token !== "string") {
        tokenState = { value: null, until: Date.now() + 2 * 60 * 1000 };
        return null;
      }
      const rawExpiry = "expires_in" in content ? Number(content.expires_in) : 3600;
      const seconds = Number.isFinite(rawExpiry) ? Math.max(90, Math.min(rawExpiry, 3600)) : 3600;
      tokenState = { value: content.access_token, until: Date.now() + (seconds - 60) * 1000 };
      return content.access_token;
    } catch {
      tokenState = { value: null, until: Date.now() + 60 * 1000 };
      return null;
    }
  })();
  try { return await tokenPending; }
  finally { tokenPending = null; }
}

function cacheResults(key: string, value: object[]) {
  if (resultsCache.size >= MAX_CACHED_QUERIES && !resultsCache.has(key)) {
    const firstKey = resultsCache.keys().next().value;
    if (firstKey) resultsCache.delete(firstKey);
  }
  resultsCache.set(key, { items: value, expires: Date.now() + DATA_CACHE_MS });
}

export async function getOpenF1Data<T extends object>(
  resource: OpenF1Resource,
  params: Record<string, number>
): Promise<T[]> {
  const url = new URL(`https://api.openf1.org/v1/${resource}`);
  for (const [key, value] of Object.entries(params).sort(([a], [b]) => a.localeCompare(b))) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Geçersiz OpenF1 sorgusu.");
    url.searchParams.set(key, String(value));
  }

  const key = url.toString();
  const cached = resultsCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.items as T[];
  if (inflight.has(key)) return await inflight.get(key) as T[];

  if (Date.now() < blockedUntil) {
    throw new OpenF1RateLimitError(Math.max(1, Math.ceil((blockedUntil - Date.now()) / 1000)));
  }

  const request = (async () => {
    const token = await getOptionalPaidToken();
    const response = await fetch(key, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Historical archives do not need a new upstream request for each admin selection.
      next: { revalidate: 60 * 60 },
      signal: AbortSignal.timeout(14000),
    });
    if (response.status === 429) {
      const retry = getRetrySeconds(response.headers.get("Retry-After"));
      blockedUntil = Math.max(blockedUntil, Date.now() + retry * 1000);
      throw new OpenF1RateLimitError(retry);
    }
    if (response.status === 401 || response.status === 403) {
      // An expired/invalid paid token should not be used again.
      tokenState = null;
      throw new Error("OpenF1 erişimi reddetti. Abonelik bilgilerini kontrol et.");
    }
    if (!response.ok) throw new Error(`OpenF1 yanıt vermedi (${response.status}).`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("OpenF1 beklenmedik bir veri döndürdü.");
    cacheResults(key, data);
    return data as object[];
  })();
  inflight.set(key, request);
  try { return await request as T[]; }
  finally { inflight.delete(key); }
}
