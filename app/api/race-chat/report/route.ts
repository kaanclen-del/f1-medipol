import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }
  const messageId = body && typeof body === "object" && "messageId" in body
    ? (body as { messageId?: unknown }).messageId
    : null;
  if (typeof messageId !== "string" || !/^[0-9a-f-]{36}$/i.test(messageId)) {
    return NextResponse.json({ error: "Geçersiz mesaj." }, { status: 400 });
  }

  const { error } = await supabase.from("race_chat_reports").insert({
    message_id: messageId,
    reporter_id: user.id,
    reason: "Uygunsuz içerik",
  });
  if (error) {
    const duplicated = error.code === "23505";
    return NextResponse.json({ error: duplicated ? "Bu mesajı zaten bildirdin." : "Bildirim gönderilemedi." }, { status: duplicated ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
