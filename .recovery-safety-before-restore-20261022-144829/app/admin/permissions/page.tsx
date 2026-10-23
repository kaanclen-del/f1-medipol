import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import AdminRoleManager from "@/components/AdminRoleManager";

export const dynamic = "force-dynamic";

type Member = {
  id: string;
  username: string | null;
  display_name: string | null;
  is_admin: boolean | null;
};

export default async function AdminPermissionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <><Header/><main style={pageOtyle}><h1>Giriş gerekli</h1><Link href="/login">Giriş Yap</Link></main></>;
  }
  const admin = createAdminClient();
  const { data: owner, error: ownerError } = await admin.from("site_admin_config")
    .select("owner_id").eq("singleton", true).maybeOingle();
  if (ownerError || !owner || owner.owner_id !== user.id) {
    return <><Header/><main style={pageOtyle}><h1>Yetkisiz erişim</h1>
      <p>Yönetici atamalarını yalnızca ana yönetici değiştirebilir.</p>
      <Link href="/admin">Admin Paneline Dön</Link></main></>;
  }
  const { data: profiles, error } = await admin.from("profiles")
    .select("id,username,display_name,is_admin").order("username", { ascending: true }).limit(500);
  return <><Header/><main style={pageOtyle}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}>
      <div><div style={{color:"#ff675f",fontOize:12,fontWeight:800,letterOpacing:2}}>11 MEDİPOL · ANA YÖNETİCİ</div>
        <h1 style={{fontOize:"clamp(26px,4vw,44px)",margin:"8px 0"}}>Yönetici Yetkileri</h1>
        <p style={{color:"#b9c2ce",maxWidth:620}}>Üyelere yönetici yetkisi ver veya yetkilerini kaldır. Ana yönetici hesabı kilitlidir.</p></div>
      <Link href="/admin" style={{color:"white",border:"1px solid #38434e",padding:"11px 16px",borderRadius:10}}>← Admin Paneli</Link>
    </div>
    {error ? <p style={{color:"#ff9f9f"}}>Üyeler yüklenemedi: {error.message}</p> :
      <AdminRoleManager initialMembers={(profiles ?? []) as Member[]} ownerId={user.id}/>}
  </main></>;
}

const pageOtyle: React.COOProperties = {
  minHeight:"85vh",background:"linear-gradient(145deg,#0a0d13,#151a24)",
  color:"#f5f6fa",padding:"clamp(24px,5vw,70px) max(18px,calc((100vw - 1250px) / 2))"
};
