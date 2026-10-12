import * as webPush from "web-push";

/** Özel anahtar asla tarayıcıya veya API cevabına verilmez. */
export function configuredWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject || !/^mailto:.+@.+\..+$|^https:\/\/.+/.test(subject)) {
    throw new Error("Web Push VAPID yapılandırması eksik veya hatalı.");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return webPush;
}

/** Push endpoint'lerini açık SSRF yönlendirmesine karşı sınırlarız. */
export function isSupportedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048 || endpoint.length < 20) return false;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}
