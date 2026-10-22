import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import AdminTeamRadioManager from "@/components/AdminTeamRadioManager";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminTeamRadioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/");

  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh", background: "#090b10", color: "#f6f7f9", padding: "50px 18px 90px" }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ color: "#ff707d", fontSize: "11px", fontWeight: 900, letterSpacing: ".15em" }}>F1 SOCIAL · ADMIN / TEAM RADIO</span>
            <Link href="/admin" style={{ color: "#c3c9d6", fontSize: "13px", textDecoration: "none" }}>← Admin paneli</Link>
          </div>
          <h1 style={{ fontSize: "clamp(30px,4vw,45px)", letterSpacing: "-.05em", margin: "20px 0 10px" }}>OpenF1 Telsiz Arşivi</h1>
          <p style={{ color: "#a7afbd", lineHeight: 1.65, margin: "0 0 28px" }}>
            Gerçek telsizleri OpenF1 arşivinden yıl, yarış, seans ve pilota göre ara. Önizle, seç ve arşivine ekle.
            Ana sayfanın sağ altındaki TEAM RADIO penceresinde yanlızca yayımladığın kayıtlar görünür.
          </p>
          <AdminTeamRadioManager />
        </div>
      </main>
    </>
  );
}
