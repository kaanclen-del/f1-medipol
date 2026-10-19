import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function PUT(request: Request, context: {params: Promise<{id:string}>}) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"Giriş yapmalısın."},{status:401});
  const {data: profile} = await supabase.from("profiles").select("is_admin").eq("id",user.id).single();
  if (!profile?.is_admin) return NextResponse.json({error:"Admin yetkisi gerekiyor."},{status:403});
  const {id} = await context.params;
  const body = await request.json().catch(() => null);
  const x = Number(body?.x);
  const y = Number(body?.y);
  if (!id || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 100 || y < 0 || y > 100) {
    return NextResponse.json({error:"Kadraj değerleri 0–100 arasında olmalı."},{status:400});
  }
  const admin=createAdminClient();
  const {data: event, error: checkError} = await admin.from("events").select("id").eq("id",id).maybeSingle();
  if (checkError || !event) return NextResponse.json({error:"Etkinlik bulunamadı."},{status:404});
  const {error} = await admin.from("event_thumbnail_settings").upsert({event_id:id,position_x:x,position_y:y,updated_at:new Date().toISOString()},{onConflict:"event_id"});
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
}
