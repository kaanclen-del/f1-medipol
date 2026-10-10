
import { NextResponse } from "next/server";
import { openF1Request } from "@/lib/openf1-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await openF1Request(
      "sessions?year=2025",
      { cache: "no-store" }
    );

    return NextResponse.json(
      {
        ok: response.ok,
        openf1Status: response.status,
        authenticatedRequest: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("OPENF1 TEST ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "OpenF1 kimlik doğrulaması başarısız.",
      },
      { status: 500 }
    );
  }
}
