import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSupportedPushEndpoint } from "@/lib/push/web-push";

export const dynamic = "force-dynamic";

function respond(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function currentUserId() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

export async function POST(request: Request) {
  try {
    const userId = await currentUserId();
    if (!userId) return respond("Bildirimler için giriş yapmalısın.", 401);

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respond("Bildirim aboneliği geçersiz.", 400);
    }
    const subscription = body as Record<string, unknown>;
    const rawKeys = subscription.keys;
    const keys = rawKeys && typeof rawKeys === "object" && !Array.isArray(rawKeys)
      ? rawKeys as Record<string, unknown> : null;
    if (!isSupportedPushEndpoint(subscription.endpoint) ||
      !keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string" ||
      keys.p256dh.length < 40 || keys.p256dh.length > 250 ||
      keys.auth.length < 12 || keys.auth.length > 200) {
      return respond("Bildirim aboneliği bilgileri uygun değil.", 400);
    }

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("push_subscriptions")
      .select("id,user_id")
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing && existing.user_id !== userId) {
      return respond("Bu cihaz aboneliği başka bir hesaba kayıtlı.", 409);
    }
    if (!existing) {
      const { count, error: countError } = await admin
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (countError) throw countError;
      if ((count ?? 0) >= 5) return respond("En fazla 5 cihaz kaydedebilirsin.", 409);
    }

    const { error: saveError } = await admin
      .from("push_subscriptions")
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
    if (saveError) throw saveError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUSH SUBSCRIBE ERROR:", error instanceof Error ? error.message : error);
    return respond("Abonelik kaydedilemedi. Veritabanı tablosunu kontrol et.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await currentUserId();
    if (!userId) return respond("Giriş yapmalısın.", 401);
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respond("Abonelik bilgisi gerekli.", 400);
    }
    const endpoint = (body as Record<string, unknown>).endpoint;
    if (!isSupportedPushEndpoint(endpoint)) return respond("Geçersiz abonelik.", 400);
    const admin = createAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUSH UNSUBSCRIBE ERROR:", error instanceof Error ? error.message : error);
    return respond("Bildirim kaydı silinemedi.", 500);
  }
}
