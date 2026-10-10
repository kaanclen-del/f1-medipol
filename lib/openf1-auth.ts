
type OpenF1TokenResponse = {
  access_token: string;
  expires_in: number | string;
  token_type: string;
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let pendingToken: Promise<string> | null = null;

export async function getOpenF1AccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (pendingToken) {
    return pendingToken;
  }

  pendingToken = (async () => {
    const username = process.env.OPENF1_USERNAME;
    const password = process.env.OPENF1_PASSWORD;

    if (!username || !password) {
      throw new Error("OpenF1 ortam değişkenleri eksik.");
    }

    const body = new URLSearchParams({
      username,
      password,
    });

    const response = await fetch(
      "https://api.openf1.org/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `OpenF1 token isteği başarısız: HTTP ${response.status}`
      );
    }

    const data =
      (await response.json()) as OpenF1TokenResponse;

    if (!data.access_token) {
      throw new Error("OpenF1 erişim anahtarı alınamadı.");
    }

    const expiresIn = Number(data.expires_in) || 3600;

    cachedToken = data.access_token;
    tokenExpiresAt =
      Date.now() + Math.max(60, expiresIn - 60) * 1000;

    return data.access_token;
  })();

  try {
    return await pendingToken;
  } finally {
    pendingToken = null;
  }
}

export async function openF1Request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getOpenF1AccessToken();

  const url = path.startsWith("https://")
    ? path
    : `https://api.openf1.org/v1/${path.replace(/^\/+/, "")}`;

  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  return fetch(url, {
    ...options,
    headers,
  });
}
