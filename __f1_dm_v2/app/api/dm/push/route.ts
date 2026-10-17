import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { configuredWebPush, isSupportedPushEndpoint } from "@/lib/push/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Device = {id:string;endpoint:string;p256dh:string;auth:string};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function respond(data:Record<string,unknown>,status=200){
  return NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request){
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin) return respond({error:"Kaynak hatası"},403);
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return respond({error:"Oturum gerekli"},401);
  const raw:unknown=await request.json().catch(()=>null);
  const body=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  const messageId=body.messageId;
  if(typeof messageId!=="string"||!uuid.test(messageId))return respond({error:"Geçersiz mesaj"},400);
  // Auth istemcisi, sadece bu kullanicinin erisebildigi gonderilmis mesaji okuyabilir.
  const {data:message,error}=await supabase.from("dm_messages")
    .select("id,sender_id,recipient_id,body,created_at")
    .eq("id",messageId).eq("sender_id",user.id).maybeSingle();
  if(error||!message)return respond({error:"Mesaj bulunamadı"},404);
  if(Date.now()-new Date(message.created_at).getTime()>90_000) return respond({error:"Bildirim süresi geçti"},400);
  try{
    const admin=createAdminClient();
    // Yalnizca bir kez push gonder; ayni mesaj icin tekrarli HTTP istekleri bildirimi spamleyemez.
    const {data:claimed,error:claimError}=await admin.from("dm_messages")
      .update({push_sent_at:new Date().toISOString()}).eq("id",messageId)
      .is("push_sent_at",null).select("id").maybeSingle();
    if(claimError||!claimed)return respond({ok:true,pushed:0,note:"Bildirim daha önce işlendi"});
    const {data:devices,error:devError}=await admin.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth").eq("user_id",message.recipient_id).limit(6);
    if(devError||!devices?.length)return respond({ok:true,pushed:0,note:"Alıcının kayıtlı bildirim cihazı yok"});
    let push:ReturnType<typeof configuredWebPush>;
    try{push=configuredWebPush();}catch{return respond({ok:true,pushed:0,note:"VAPID yapılandırması eksik"});}
    const {data:sender}=await supabase.from("profiles")
      .select("display_name").eq("id",user.id).maybeSingle();
    const name=sender?.display_name?.trim()||"F1 Medipol";
    const text=String(message.body||"Yeni mesaj").slice(0,120);
    let pushed=0;
    await Promise.all((devices as Device[]).filter(d=>isSupportedPushEndpoint(d.endpoint)).map(async d=>{
      try{
        await push.sendNotification({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth}},
          JSON.stringify({title:`${name} · Yeni mesaj`,body:text,url:`/?dm=${user.id}`,tag:`f1-dm-${message.id}`}),
          {TTL:3600,urgency:"normal",timeout:8000});
        pushed++;
      }catch(e){
        if([404,410].includes((e as {statusCode?:number}).statusCode||0))
          await admin.from("push_subscriptions").delete().eq("id",d.id);
      }
    }));
    return respond({ok:true,pushed});
  }catch{return respond({ok:true,pushed:0,note:"Push servisi şu anda kullanılamıyor"});}
}
