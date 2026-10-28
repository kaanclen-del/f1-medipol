/* F1 SOCIAL Web Push Service Worker (v1)
 * Bildirim haricinde sayfa isteklerine dokunmaz; offline cache yapmaz.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "Yeni bildirim" };
  }

  const title = typeof payload.title === "string"
    ? payload.title.slice(0, 100) : "F1 SOCIAL";
  const body = typeof payload.body === "string"
    ? payload.body.slice(0, 300) : "Yeni bir bildirimin var.";
  const candidate = typeof payload.url === "string" ? payload.url : "/";
  const url = candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate : "/";

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/f1-social-push-icon.png",
    badge: "/f1-social-push-icon.png",
    tag: typeof payload.tag === "string" ? payload.tag.slice(0, 100) : "f1-social-push",
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const url = new URL(target, self.location.origin);
    if (url.origin !== self.location.origin) return;
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin) {
        if (typeof tab.navigate === "function") await tab.navigate(url.href);
        return tab.focus();
      }
    }
    return self.clients.openWindow(url.href);
  })());
});
