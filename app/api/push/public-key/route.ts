import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Bildirim anahtarları henüz yapılandırılmadı." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "no-store" } });
}
