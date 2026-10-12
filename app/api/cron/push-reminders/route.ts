import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { configuredWebPush, isSupportedPushEndpoint } from "@/lib/push/web-push";
import { isDue, loadReminderSchedule } from "@/lib/push/auto-reminder-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 2 dakikada bir çalışır. Toplu gönderimler kalan kuyruktan devam eder.
const BATCH = 40;
const PARALLEL = 8;

type Delivery = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  target_url: string;
  event_key: string;
};

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401, headers: noStore });
  }

  const params = new URL(request.url).searchParams;
  const dryRun = params.get("dryRun") === "1";
  const nowMs = Date.now();
  let schedule;
  try {
    schedule = await loadReminderSchedule(nowMs);
  } catch (error) {
    console.error("AUTO PUSH CALENDAR:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Yarış takvimi şu an alınamadı; bildirim gönderilmedi." }, {
      status: 503, headers: noStore,
    });
  }
  const due = schedule.filter(item => isDue(item, nowMs));
  const upcoming = schedule
    .filter(item => Date.parse(item.scheduledFor) > nowMs)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .slice(0, 8)
    .map(({ key, kind, scheduledFor }) => ({ key, kind, scheduledFor }));

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, checkedAt: new Date(nowMs).toISOString(),
      due: due.map(({ key, kind, scheduledFor }) => ({ key, kind, scheduledFor })), upcoming,
      note: "Kayıt veya push gönderimi yapılmadı." }, { headers: noStore });
  }

  const admin = createAdminClient();
  const enqueued: string[] = [];
  try {
    for (const item of due) {
      const { data, error } = await admin.rpc("f1_auto_enqueue", {
        p_key: item.key,
        p_kind: item.kind,
        p_title: item.title,
        p_body: item.body,
        p_url: item.url,
        p_due_at: item.scheduledFor,
      });
      if (error) throw error;
      if (data) enqueued.push(item.key);
    }
  } catch (error) {
    console.error("AUTO PUSH ENQUEUE:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Hatırlatma kuyruğuna eklenemedi. SQL kurulumunu kontrol et." }, {
      status: 500, headers: noStore,
    });
  }

  // Hiçbir olay yaklaşmasa da eski kuyruktaki gönderimler tamamlanır.
  const { data: rows, error: claimError } = await admin.rpc("f1_auto_claim_deliveries", { p_limit: BATCH });
  if (claimError) {
    console.error("AUTO PUSH CLAIM:", claimError.code);
    return NextResponse.json({ error: "Gönderim kuyruğu okunamadı." }, { status: 500, headers: noStore });
  }
  const deliveries = (rows ?? []) as Delivery[];
  if (!deliveries.length) return NextResponse.json({ ok: true, enqueued, queuedDevicesProcessed: 0,
    upcoming }, { headers: noStore });

  let push;
  try { push = configuredWebPush(); }
  catch { return NextResponse.json({ error: "VAPID anahtarları eksik; kuyruk bekletildi." }, {
    status: 503, headers: noStore,
  }); }

  let sent = 0;
  let failed = 0;
  for (let start = 0; start < deliveries.length; start += PARALLEL) {
    await Promise.all(deliveries.slice(start, start + PARALLEL).map(async d => {
      let delivered = false;
      let expired = false;
      try {
        if (!isSupportedPushEndpoint(d.endpoint)) { expired = true; }
        else {
          await push.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
            JSON.stringify({ title: d.title, body: d.body, url: d.target_url, tag: d.event_key }),
            { TTL: 3600, urgency: "normal", timeout: 6000 });
          delivered = true;
        }
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        expired = status === 404 || status === 410;
        console.warn("AUTO PUSH DELIVERY:", status ?? "network");
      }
      const { error: finishError } = await admin.rpc("f1_auto_finish_delivery", {
        p_id: d.id, p_success: delivered, p_expired: expired,
      });
      if (finishError) console.error("AUTO PUSH FINISH:", finishError.code);
      if (expired) {
        await admin.from("push_subscriptions").delete().eq("endpoint", d.endpoint);
      }
      if (delivered) sent++;
      else failed++;
    }));
  }
  return NextResponse.json({ ok: true, enqueued, queuedDevicesProcessed: deliveries.length,
    acceptedByPushProvider: sent, failed, upcoming,
    note: "Push sağlayıcısının kabulü cihazda teslim garantisi değildir." }, { headers: noStore });
}
