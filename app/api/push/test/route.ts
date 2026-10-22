import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { listUserPushDevices } from "@/lib/push/list-user-devices";
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
      return NextResponse.json({ error: "GiriÅŸ yapmalÄ±sÄ±n." }, { status: 401 });
    }

    const admin = createAdminClient();
    const devices = await listUserPushDevices<Device>(admin, user.id,
      "id,endpoint,p256dh,auth,last_test_sent_at");
    if (devices.length === 0) {
      return NextResponse.json({ error: "Ã–nce bildirimleri etkinleÅŸtir." }, { status: 400 });
    }

    let push;
    try {
      push = configuredWebPush();
    } catch {
      return NextResponse.json({ error: "VAPID anahtarlarÄ± yapÄ±landÄ±rÄ±lmadÄ±." }, { status: 503 });
    }

    let sent = 0;
    let rateLimited = 0;
    const cutoff = new Date(Date.now() - 45_000).toISOString();
    for (let start = 0; start < devices.length; start += 8) {
      await Promise.all(devices.slice(start, start + 8).map(async device => {
      if (!isSupportedPushEndpoint(device.endpoint)) return;
      // Atomik koÅŸullu UPDATE: aynÄ± cihaza 45 saniyede birden Ã§ok test engellenir.
      const { data: claimed, error: claimError } = await admin
        .from("push_subscriptions")
        .update({ last_test_sent_at: new Date().toISOString() })
        .eq("id", device.id)
        .eq("user_id", user.id)
        .or(`last_test_sent_at.is.null,last_test_sent_at.lt.${cutoff}`)
        .select("id");
      if (claimError) throw claimError;
      if (!claimed?.length) { rateLimited++; return; }

      try {
        await push.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          JSON.stringify({
            title: "F1 SOCIAL ğŸ",
            body: "Test bildirimi baÅŸarÄ±lÄ±! YarÄ±ÅŸ ve tahmin hatÄ±rlatmalarÄ±na bir adÄ±m kaldÄ±.",
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
      }));
    }
    if (sent === 0) {
      return NextResponse.json({
        error: rateLimited > 0
          ? "Yeni test gÃ¶ndermek iÃ§in 45 saniye bekle."
          : "Bildirim iletilemedi. Cihaz izni ve sunucu ayarlarÄ±nÄ± kontrol et.",
      }, { status: rateLimited > 0 ? 429 : 502 });
    }
    // BaÅŸarÄ±yla push saÄŸlayÄ±cÄ±sÄ±na iletilen testler, kullanÄ±cÄ±nÄ±n
    // site iÃ§i bildirim kutusuna da eklenir. Cihaza teslim garantisi deÄŸildir.
    // SQL migrasyonu henÃ¼z kurulmadÄ±ysa mevcut push iÅŸleyiÅŸi bozulmaz.
    const { error: historyError } = await admin.from("site_notifications").insert({
      user_id: user.id,
      kind: "test",
      title: "F1 SOCIAL ğŸ",
      body: "Test bildirimi gÃ¶nderildi! YarÄ±ÅŸ ve tahmin hatÄ±rlatmalarÄ±na bir adÄ±m kaldÄ±.",
      target_url: "/bildirimler",
    });
    if (historyError) console.warn("PUSH HISTORY SAVE:", historyError.code);
    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("PUSH TEST ERROR:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Test bildirimi gÃ¶nderilemedi." }, { status: 500 });
  }
}
