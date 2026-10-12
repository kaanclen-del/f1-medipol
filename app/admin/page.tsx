
import Link from "next/link";

import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />

        <main className="admin-access">
          <style>{styles}</style>

          <div className="access-card">
            <span>F1 MEDİPOL · ADMIN</span>
            <h1>Giriş Gerekli</h1>
            <p>
              Yönetim panelini görüntülemek için
              giriş yapmalısın.
            </p>

            <Link
              href="/login"
              className="admin-button red"
            >
              Giriş Yap
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <>
        <Header />

        <main className="admin-access">
          <style>{styles}</style>

          <div className="access-card">
            <span>F1 MEDİPOL · ADMIN</span>
            <h1>Yetkisiz Erişim</h1>
            <p>
              Bu bölüm yalnızca yöneticiler
              tarafından kullanılabilir.
            </p>

            <Link
              href="/"
              className="admin-button"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </main>
      </>
    );
  }

  const admin = createAdminClient();

  const [
    eventsResult,
    achievementsResult,
    awardsResult,
  ] = await Promise.all([
    admin
      .from("events")
      .select("id, is_published"),

    admin
      .from("achievements")
      .select("id, is_published"),

    admin
      .from("user_achievements")
      .select("id", {
        count: "exact",
        head: true,
      }),
  ]);

  const events = eventsResult.data ?? [];
  const achievements =
    achievementsResult.data ?? [];

  const totalEvents = events.length;

  const publishedEvents = events.filter(
    (event) => event.is_published
  ).length;

  const totalAchievements =
    achievements.length;

  const publishedAchievements =
    achievements.filter(
      (achievement) => achievement.is_published
    ).length;

  const totalAwards = awardsResult.count ?? 0;

  const displayName =
    profile.display_name ||
    profile.username ||
    user.email?.split("@")[0] ||
    "Admin";

  return (
    <>
      <Header />

      <main className="admin-page">
        <style>{styles}</style>

        <div className="admin-wrap">

          {/* HERO */}

          <section className="admin-hero">
            <div className="admin-eyebrow">
              F1 MEDİPOL · CONTROL CENTER
            </div>

            <h1>ADMIN PANELİ</h1>

            <p>
              Hoş geldin, {displayName}.
            </p>

            <div className="admin-active-badge">
              ● YÖNETİCİ OTURUMU AKTİF
            </div>
          </section>

          {/* İSTATİSTİKLER */}

          <section className="admin-stats">
            <StatCard
              label="ETKİNLİK"
              value={totalEvents}
              text="Toplam"
            />

            <StatCard
              label="YAYINDA"
              value={publishedEvents}
              text="Etkinlik"
            />

            <StatCard
              label="ROZET"
              value={totalAchievements}
              text={`${publishedAchievements} yayında`}
            />

            <StatCard
              label="ÖDÜL"
              value={totalAwards}
              text="Dağıtılan rozet"
            />
          </section>

          {/* YÖNETİM MODÜLLERİ */}

          <section className="admin-modules">
            <div className="admin-eyebrow">
              YÖNETİM MODÜLLERİ
            </div>

            <h2>Kontrol Merkezi</h2>

            <div className="admin-module-grid">

              {/* ETKİNLİKLER */}

              <Link
                href="/admin/events"
                className="admin-module"
              >
                <div className="module-icon">
                  🏁
                </div>

                <span>ACTIVE MODULE</span>

                <h3>Etkinlik Yönetimi</h3>

                <p>
                  Etkinlikleri oluştur,
                  yayınla ve yönet.
                </p>

                <strong>
                  PANELE GİT →
                </strong>
              </Link>

              {/* BAŞARIMLAR */}

              <Link
                href="/admin/achievements"
                className="admin-module achievement-module"
              >
                <div className="module-icon">
                  🏆
                </div>

                <span>ACTIVE MODULE</span>

                <h3>Rozet & Başarım</h3>

                <p>
                  Rozet oluştur, şart belirle,
                  görsel yükle ve kullanıcıları
                  ödüllendir.
                </p>

                <strong>
                  BAŞARIM MERKEZİ →
                </strong>
              </Link>

              {/* GALERİ */}

              <Link
                href="/admin/gallery"
                className="admin-module"
              >
                <div className="module-icon">
                  📸
                </div>

                <span>MODULE</span>

                <h3>Galeri Yönetimi</h3>

                <p>
                  Galeri içeriklerini yönet.
                </p>

                <strong>
                  PANELE GİT →
                </strong>
              </Link>

              {/* YÖNETİM KURULU */}

              <Link
                href="/admin/board"
                className="admin-module"
              >
                <div className="module-icon">
                  👥
                </div>

                <span>MODULE</span>

                <h3>Yönetim Kurulu</h3>

                <p>
                  Yönetim kurulu üyelerini
                  düzenle.
                </p>

                <strong>
                  PANELE GİT →
                </strong>
              </Link>

              {/* HAFTALIK YORUM */}
              <Link href="/admin/weekly-commentary" className="admin-module">
                <div className="module-icon">📝</div>
                <span>CONTENT MODULE</span>
                <h3>Haftalık Yorum</h3>
                <p>İdil Boyalı'nın haftalık yazısını, başlığını, görselini ve yayın durumunu yönet.</p>
                <strong>YORUMU DÜZENLE →</strong>
              </Link>

              {/* YENİ: YARIŞ GÖRSELLERİ */}

              <Link
                href="/admin/race-hero-images"
                className="admin-module race-hero-module"
              >
                <div className="module-icon">
                  🏎️
                </div>

                <span>NEW MODULE</span>

                <h3>Yarış Görselleri</h3>

                <p>
                  Grand Prix seç, ana sayfa
                  arka plan fotoğraflarını yükle,
                  sırala ve yönet.
                </p>

                <strong>
                  GÖRSELLERİ YÖNET →
                </strong>
              </Link>

            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  text,
}: {
  label: string;
  value: number;
  text: string;
}) {
  return (
    <div className="admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </div>
  );
}

const styles = `
  .admin-page,
  .admin-access {
    min-height: calc(100vh - 70px);
    color: #f5f7fa;

    background:
      radial-gradient(
        circle at 88% 0%,
        rgba(225, 6, 0, .12),
        transparent 30%
      ),
      linear-gradient(
        145deg,
        #0f131a,
        #07090d
      );
  }

  .admin-wrap {
    width: min(
      1450px,
      calc(100% - 36px)
    );

    margin: auto;
    padding: 32px 0 90px;
  }

  .admin-hero {
    padding: 34px;

    border: 1px solid rgba(255, 255, 255, .09);
    border-radius: 17px;

    background:
      radial-gradient(
        circle at 90% 10%,
        rgba(225, 6, 0, .15),
        transparent 32%
      ),
      linear-gradient(
        145deg,
        #232b36,
        #171d26
      );
  }

  .admin-eyebrow,
  .admin-module > span,
  .admin-stat > span,
  .access-card > span {
    color: #ff5149;

    font-size: 8px;
    font-weight: 1000;
    letter-spacing: .12em;
  }

  .admin-hero h1 {
    margin: 8px 0 6px;
    font-size: 48px;
    letter-spacing: -.04em;
  }

  .admin-hero p {
    margin: 0;
    color: #9da8b5;
  }

  .admin-active-badge {
    display: inline-block;
    margin-top: 18px;
    padding: 8px 12px;

    border: 1px solid rgba(53, 212, 119, .22);
    border-radius: 999px;

    color: #65df96;
    background: rgba(53, 212, 119, .10);

    font-size: 9px;
    font-weight: 900;
  }

  .admin-stats {
    margin-top: 14px;

    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));

    gap: 12px;
  }

  .admin-stat {
    min-height: 130px;
    padding: 20px;

    display: flex;
    flex-direction: column;
    justify-content: center;

    border: 1px solid rgba(255, 255, 255, .09);
    border-radius: 13px;
    background: #131820;
  }

  .admin-stat strong {
    margin-top: 7px;
    font-size: 34px;
  }

  .admin-stat small {
    color: #7f8b99;
  }

  .admin-modules {
    margin-top: 32px;
  }

  .admin-modules h2 {
    margin: 7px 0 17px;
    font-size: 30px;
  }

  .admin-module-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .admin-module {
    position: relative;

    min-height: 220px;
    padding: 25px;
    overflow: hidden;

    border: 1px solid rgba(255, 255, 255, .09);
    border-radius: 15px;

    color: #fff;
    background: #131820;

    transition: .2s ease;
  }

  .admin-module:hover {
    transform: translateY(-3px);
    border-color: rgba(255, 81, 73, .35);
    background: #171d26;
  }

  .achievement-module {
    background:
      radial-gradient(
        circle at 90% 10%,
        rgba(242, 196, 73, .13),
        transparent 35%
      ),
      #131820;
  }

  .race-hero-module {
    background:
      radial-gradient(
        circle at 90% 10%,
        rgba(225, 6, 0, .19),
        transparent 45%
      ),
      linear-gradient(
        145deg,
        #1c2029,
        #131820
      );
  }

  .race-hero-module > span {
    color: #ff7770;
  }

  .module-icon {
    margin-bottom: 18px;
    font-size: 36px;
  }

  .admin-module h3 {
    margin: 8px 0;
    font-size: 24px;
  }

  .admin-module p {
    max-width: 440px;
    color: #8995a3;
    font-size: 11px;
    line-height: 1.6;
  }

  .admin-module > strong {
    position: absolute;
    left: 25px;
    bottom: 24px;

    color: #ff625b;
    font-size: 9px;
  }

  .admin-access {
    padding: 60px 20px;
  }

  .access-card {
    width: min(650px, 100%);
    margin: auto;
    padding: 32px;

    border: 1px solid rgba(255, 255, 255, .09);
    border-radius: 16px;
    background: #131820;
  }

  .access-card p {
    color: #9da8b5;
  }

  .admin-button {
    min-height: 42px;
    padding: 0 15px;

    display: inline-flex;
    align-items: center;

    border: 1px solid rgba(255, 255, 255, .1);
    border-radius: 8px;

    color: #fff;
    background: rgba(255, 255, 255, .05);
  }

  .admin-button.red {
    border: 0;
    background: #e10600;
  }

  @media (max-width: 900px) {
    .admin-stats {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 650px) {
    .admin-module-grid,
    .admin-stats {
      grid-template-columns: 1fr;
    }

    .admin-hero h1 {
      font-size: 36px;
    }
  }
`;
