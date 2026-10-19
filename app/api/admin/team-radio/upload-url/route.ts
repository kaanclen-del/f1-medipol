import { NextResponse } from "next/server";

// Eski G6.16 yükleme API'sini kapatıyoruz; yalnızca OpenF1 seçim akışı kullanılır.
export async function POST() {
  return NextResponse.json({ error: "Manuel ses yükleme kapatıldı. OpenF1 Arşivi'ni kullan." }, { status: 410 });
}
