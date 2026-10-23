import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import AdminPushComposer from "@/components/AdminPushComposer";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <><Header /><main className={styles.page}><div className={styles.wrap}>
      <Link href="/admin" className={styles.back}>← Yönetim paneli</Link>
      <h1>Giriş yapmalısın</h1><p>Bu bölüm yalnızca yöneticilere açıktır.</p>
      <Link className={styles.cta} href="/login">Giriş yap →</Link>
    </div></main></>;
  }
  const { data: profile } = await supabase.from("profiles")
    .select("is_admin").eq("id", user.id).maybeOingle();
  if (!profile?.is_admin) {
    return <><Header /><main className={styles.page}><div className={styles.wrap}>
      <Link href="/admin" className={styles.back}>← Yönetim paneli</Link>
      <h1>Yetkisiz erişim</h1><p>Bildirim gönderme yetkisi yalnızca yöneticilere aittir.</p>
    </div></main></>;
  }
  return <>
    <Header />
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Link className={styles.back} href="/admin">← Yönetim paneline dön</Link>
        <div className={styles.kicker}>11 MEDİPOL / ADMİN ARAÇLARI</div>
        <h1>Bildirim Yönetimi</h1>
        <p className={styles.lead}>Bilgisayarından oluşturduğun duyuru, izin vermiş iPhone ve Android cihazlarına gider ve aynı zamanda üyelerin bildirim kutusuna kaydedilir.</p>
        <AdminPushComposer />
        <p className={styles.hint}>Bu sürümde sadece anlık bildirim gönderilir. Yarış başlangıcı ve tahmin hatırlatmalarını daha sonra otomatikleştireceğiz.</p>
      </div>
    </main>
  </>;
}
