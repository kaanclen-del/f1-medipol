import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("is_admin").eq("id", user.id).maybeSingle();
    if (profileError || !profile?.is_admin) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Görsel seçilmedi." }, { status: 400 });
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    };
    const ext = extensions[file.type];
    if (!ext) return NextResponse.json({ error: "Yalnızca JPG, PNG ve WEBP yüklenebilir." }, { status: 400 });
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Görsel 5 MB'ı geçmemeli ve boş olmamalı." }, { status: 400 });
    }
    const path = `weekly-commentaries/${user.id}/${crypto.randomUUID()}.${ext}`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from("gallery-images").upload(path, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type, upsert: false,
    });
    if (error) throw error;
    const { data: { publicUrl } } = admin.storage.from("gallery-images").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: publicUrl, path });
  } catch (error) {
    console.error("WEEKLY UPLOAD:", error);
    return NextResponse.json({ error: "Görsel yüklenemedi. Gallery-images bucket'ını kontrol et." }, { status: 500 });
  }
}
