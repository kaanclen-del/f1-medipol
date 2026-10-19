import { NextResponse } from "next/server";
import { getTeamRadioAdmin } from "@/lib/team-radio-admin";
import { TEAM_RADIO_BUCKET } from "@/lib/team-radio-types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const auth = await getTeamRadioAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    const body = await request.json();
    if (typeof body.isPublished !== "boolean") return NextResponse.json({ error: "Geçersiz yayımlama seçimi." }, { status: 400 });
    if (body.isPublished !== false && body.rightsConfirmed !== true) {
      return NextResponse.json({ error: "Yayımlamadan önce kayıtların kullanım hakkını doğrulamalısın." }, { status: 400 });
    }
    const { data, error } = await auth.admin.from("team_radio_clips")
      .update({ is_published: body.isPublished }).eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("TEAM RADIO ADMIN UPDATE:", error);
    return NextResponse.json({ error: "Kayıt güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const auth = await getTeamRadioAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    const { data, error: lookupError } = await auth.admin.from("team_radio_clips").select("audio_path").eq("id", id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!data) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
    const { error: deleteError } = await auth.admin.from("team_radio_clips").delete().eq("id", id);
    if (deleteError) throw deleteError;
    // OpenF1 kayıtları bağlantı olarak tutulur. Harici ses asla silinmez.
    if (data.audio_path) {
      const { error: storageError } = await auth.admin.storage.from(TEAM_RADIO_BUCKET).remove([data.audio_path]);
      if (storageError) console.error("TEAM RADIO OLD FILE CLEANUP:", storageError);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("TEAM RADIO ADMIN DELETE:", error);
    return NextResponse.json({ error: "Kayıt silinemedi." }, { status: 500 });
  }
}
