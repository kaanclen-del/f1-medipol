import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { configuredWebPush, isSupportedPushEndpoint } from "@/lib/push/web-push";

export const dynamic = "force-dynamic";

type Device = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_test_sent_at: string | null;
};

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth,last_test_sent_at")
      .eq("user_id", user.id).limit(5);
    if (error) throw error;
    const devices = (data ?? []) as Device[];
    if (devices.length === 0) {
      return NextResponse.json({ error: "Önce bildirimleri etkinleştir." }, { status: 400 });
    }

    let push;
    try {
      push = configuredWebPush();
    } catch {
      return NextResponse.json({ error: "VAPID anahtarları yapılandırılmadı." }, { status: 503 });
    }

    let sent = 0;
    let rateLimited = 0;
    const cutoff = new Date(Date.now() - 45_000).toISOString();
    for (const device of devices) {
      if (!isSupportedPushEndpoint(device.endpoint)) continue;
      // Atomik koşullu UPDATE: aynı cihaza 45 saniyede birden çok test engellenir.
      const { data: claimed, error: claimError } = await admin
        .from("push_subscriptions")
        .update({ last_test_sent_at: new Date().toISOString() })
        .eq("id", device.id)
        .eq("user_id", user.id)
        .or(`last_test_sent_at.is.null,last_test_sent_at.lt.${cutoff}`)
        .select("id");
      if (claimError) throw claimError;
      if (!claimed?.length) { rateLimited++; continue; }

      try {
        await push.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          JSON.stringify({
            title: "F1 Medipol 🏁",
            body: "Test bildirimi başarılı! Yarış ve tahmin hatırlatmalarına bir adım kaldı.",
            url: "/bildirimler",
            tag: "f1-medipol-test",
          }),
          { TTL: 90, urgency: "normal" },
        );
        sent++;
      } catch (pushError) {
        const status = (pushError as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", device.id).eq("user_id", user.id);
        } else {
          console.error("PUSH SEND ERROR:", status ?? "unknown");
        }
      }
    }
    if (sent === 0) {
      return NextResponse.json({
        error: rateLimited > 0
          ? "Yeni test göndermek için 45 saniye bekle."
          : "Bildirim iletilemedi. Cihaz izni ve sunucu ayarlarını kontrol et.",
      }, { status: rateLimited > 0 ? 429 : 502 });
    }
    // Başarıyla push sağlayıcısına iletilen testler, kullanıcının
    // site içi bildirim kutusuna da eklenir. Cihaza teslim garantisi değildir.
    // SQL migrasyonu henüz kurulmadıysa mevcut push işleyişi bozulmaz.
    const { error: historyError } = await admin.from("site_notifications").insert({
      user_id: user.id,
      kind: "test",
      title: "F1 Medipol 🏁",
      body: "Test bildirimi gönderildi! Yarış ve tahmin hatırlatmalarına bir adım kaldı.",
      target_url: "/bildirimler",
    });
    if (historyError) console.warn("PUSH HISTORY SAVE:", historyError.code);
    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("PUSH TEST ERROR:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Test bildirimi gönderilemedi." }, { status: 500 });
  }
}
