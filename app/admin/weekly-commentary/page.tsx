import Link from "next/link";
import Header from "@/components/Header";
import WeeklyCommentaryEditor from "@/components/WeeklyCommentaryEditor";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function WeeklyCommentaryAdminPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return <>
    <Header />
    <main style={{ minHeight: "80vh", padding: "80px 20px", background: "#080b11", color: "white", textAlign: "center" }}>
      <h1>Giriş Gerekli</h1>
      <p>Yorum yönetimini kullanmak için giriş yapmalısın.</p>
      <Link href="/login" style={{ color: "#ff5149" }}>Giriş Yap →</Link>
    </main>
  </>;

  const { data: profile } = await client.from("profiles")
    .select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return <>
    <Header />
    <main style={{ minHeight: "80vh", padding: "80px 20px", background: "#080b11", color: "white", textAlign: "center" }}>
      <h1>Yetkisiz Erişim</h1>
      <p>Bu bölüm yalnızca yönetim kurulu yöneticileri tarafından kullanılabilir.</p>
      <Link href="/" style={{ color: "#ff5149" }}>Ana Sayfaya Dön →</Link>
    </main>
  </>;
  return <WeeklyCommentaryEditor />;
}
