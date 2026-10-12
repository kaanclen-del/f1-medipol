import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { configuredWebPush, isSupportedPushEndpoint } from "@/lib/push/web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TARGET_DEVICES = 100;
const GAP_SECONDS = 60;

type PushDevice = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function adminContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { authorized: false as const, status: 401 };

  // Her admin isteğinde yetki veritabanından taze doğrulanır.
  const { data: profile, error: roleError } = await supabase.from("profiles")
    .select("is_admin").eq("id", user.id).maybeSingle();
  if (roleError || !profile?.is_admin) return { authorized: false as const, status: 403 };
  return { authorized: true as const, userId: user.id };
}

function parseBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const target = typeof data.target === "string" ? data.target : "self";
  const url = typeof data.url === "string" ? data.url.trim() : "/bildirimler";
  // Bildirim tıklamaları site dışına yönlendirmez.
  const internalPath = /^\/(?!\/)[\p{L}\p{N}a-zA-Z0-9/_?#=&%+.,~!\-]*$/u.test(url) && !url.includes("\\");
  if (title.length < 3 || title.length > 90 || body.length < 5 || body.length > 260 ||
      !["self", "subscribers"].includes(target) || !internalPath || url.length > 250) return null;
  return { title, body, target, url };
}

function getOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch { return false; }
}

export async function GET() {
  const access = await adminContext();
  if (!access.authorized) return failure("Yönetici yetkisi gerekiyor.", access.status);
  try {
    const admin = createAdminClient();
    const { count, error } = await admin.from("push_subscriptions")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ devices: count ?? 0, maxDevices: MAX_TARGET_DEVICES },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ADMIN PUSH STATS:", error instanceof Error ? error.message : error);
    return failure("Cihaz sayısı alınamadı.", 500);
  }
}

export async function POST(request: Request) {
  // Tarayıcıdan gönderilen form için aynı kaynak denetimi (CSRF koruması).
  if (!getOrigin(request)) return failure("İzin verilmeyen kaynak.", 403);
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return failure("JSON bekleniyor.", 415);
  }
  const access = await adminContext();
  if (!access.authorized) return failure("Yönetici yetkisi gerekiyor.", access.status);

  const raw: unknown = await request.json().catch(() => null);
  const data = parseBody(raw);
  if (!data) return failure("Başlık, mesaj, alıcı veya bağlantı geçersiz.", 400);

  try {
    const admin = createAdminClient();

    // Yeni duyuruların kazara veya otomatik olarak art arda atılmasını sınırla.
    const since = new Date(Date.now() - GAP_SECONDS * 1000).toISOString();
    const { data: recent, error: recentError } = await admin.from("site_notifications")
      .select("id").eq("kind", "admin_announcement").gte("created_at", since).limit(1);
    if (recentError) throw recentError;
    if (recent?.length) return failure("Yeni bildirim göndermek için 60 saniye bekle.", 429);

    let query = admin.from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .order("created_at", { ascending: false })
      .limit(data.target === "self" ? 6 : MAX_TARGET_DEVICES + 1);
    if (data.target === "self") query = query.eq("user_id", access.userId);
    const { data: rawDevices, error: deviceError } = await query;
    if (deviceError) throw deviceError;
    const devices = ((rawDevices ?? []) as PushDevice[]).filter(d => isSupportedPushEndpoint(d.endpoint));

    if (data.target === "subscribers" && (rawDevices?.length ?? 0) > MAX_TARGET_DEVICES) {
      return failure(`Şimdilik tek seferde en fazla ${MAX_TARGET_DEVICES} cihaza gönderilebilir. Toplu gönderim kuyruğu henüz kurulmadı.`, 413);
    }
    if (!devices.length) {
      return failure(data.target === "self"
        ? "Hesabına kayıtlı cihaz bulunamadı. Önce iPhone'da Bildirimleri Etkinleştir'e bas."
        : "Henüz bildirim izni vermiş üye bulunmuyor.", 400);
    }

    let push;
    try { push = configuredWebPush(); }
    catch { return failure("Sunucuda VAPID bildirim anahtarları eksik.", 503); }

    const recipients = [...new Set(devices.map(d => d.user_id))];
    const { error: saveError } = await admin.from("site_notifications").insert(recipients.map(userId => ({
      user_id: userId, kind: "admin_announcement", title: data.title,
      body: data.body, target_url: data.url,
    })));
    if (saveError) {
      console.error("ADMIN PUSH INBOX:", saveError.code);
      return failure("Gelen kutusuna kayıt yapılamadı. Bildirim gönderilmedi.", 503);
    }

    let pushed = 0;
    let failed = 0;
    for (let i = 0; i < devices.length; i += 8) {
      await Promise.all(devices.slice(i, i + 8).map(async d => {
        try {
          await push.sendNotification(
            { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
            JSON.stringify({ title: data.title, body: data.body, url: data.url,
              tag: `f1-announcement-${Date.now()}` }),
            { TTL: 3600, urgency: "normal", timeout: 8000 },
          );
          pushed++;
        } catch (error) {
          failed++;
          const status = (error as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", d.id);
          } else {
            console.error("ADMIN PUSH DEVICE:", status ?? "unknown");
          }
        }
      }));
    }

    return NextResponse.json({ ok: true, recipients: recipients.length, devices: devices.length,
      pushed, failed, inboxSaved: recipients.length,
      note: pushed === 0 ? "Gelen kutusuna eklendi, ancak push servisine gönderilemedi." : undefined },
    { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ADMIN PUSH ERROR:", error instanceof Error ? error.message : error);
    return failure("Bildirim gönderilemedi. Sunucu kayıtlarını kontrol et.", 500);
  }
}
