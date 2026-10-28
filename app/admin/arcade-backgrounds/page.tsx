import Link from "next/link";
import Header from "@/components/Header";
import AdminArcadeBackgroundsClient from "@/components/AdminArcadeBackgroundsClient";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function ArcadeBackgroundsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />
        <main style={{ minHeight: "60vh", padding: 32, color: "white", background: "#0c1016" }}>
          <h1>Giriş gerekli</h1>
          <p>Oyun arka planlarını yönetmek için giriş yapmalısın.</p>
          <Link href="/login">Giriş yap →</Link>
        </main>
      </>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <>
        <Header />
        <main style={{ minHeight: "60vh", padding: 32, color: "white", background: "#0c1016" }}>
          <h1>Yetkisiz erişim</h1>
          <Link href="/">Ana sayfaya dön →</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{
        minHeight: "calc(100vh - 70px)",
        background: "radial-gradient(circle at 85% 0%,rgba(225,6,0,.12),transparent 35%),#0c1016",
      }}>
        <AdminArcadeBackgroundsClient />
      </main>
    </>
  );
}
