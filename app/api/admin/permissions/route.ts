import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(error: string, status: number) {
  return NextResponse.json({ok:false,error},{status,headers:{"Cache-Control":"no-store"}});
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return response("Geçersiz kaynak.",403);
  if (!(request.headers.get("content-type")??"").startsWith("application/json")) return response("JSON gerekli.",415);
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) return response("Giriş gerekli.",401);
  const admin = createAdminClient();
  const {data:config,error:configError} = await admin.from("site_admin_config")
    .select("owner_id").eq("singleton",true).maybeSingle();
  if (configError || !config || config.owner_id !== user.id) return response("Sadece ana yönetici bu işlemi yapabilir.",403);
  const raw: unknown = await request.json().catch(()=>null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return response("Geçersiz istek.",400);
  const body = raw as Record<string,unknown>;
  const targetId = body.userId;
  const enabled = body.enabled;
  if (typeof targetId !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(targetId)
    || typeof enabled !== "boolean") return response("Kullanıcı veya yetki geçersiz.",400);
  if (targetId === config.owner_id) return response("Ana yöneticinin yetkisi değiştirilemez.",403);
  const {data:target,error:targetError} = await admin.from("profiles")
    .select("id,is_admin").eq("id",targetId).maybeSingle();
  if (targetError || !target) return response("Kullanıcı bulunamadı.",404);
  if (Boolean(target.is_admin) === enabled) return NextResponse.json({ok:true,isAdmin:enabled});
  const {data:updated,error:updateError} = await admin.from("profiles")
    .update({is_admin:enabled}).eq("id",targetId).select("id,is_admin").single();
  if (updateError || !updated) {
    console.error("ROLE UPDATE ERROR:",updateError?.message);
    return response("Yetki güncellenemedi.",500);
  }
  return NextResponse.json({ok:true,isAdmin:Boolean(updated.is_admin)},{headers:{"Cache-Control":"no-store"}});
}
