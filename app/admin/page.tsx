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

        <main
          className="site-container"
          style={{
            paddingTop: "50px",
            paddingBottom: "80px",
          }}
        >
          <div
            className="card"
            style={{
              padding: "32px",
              maxWidth: "650px",
            }}
          >
            <div className="eyebrow">F1 MEDİPOL · ADMIN</div>

            <h1>Giriş Gerekli</h1>

            <p style={{ color: "#9da8b5" }}>
              Yönetim panelini görüntülemek için giriş yapmalısın.
            </p>

            <a href="/login" className="btn btn-red">
              Giriş Yap
            </a>
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

        <main
          className="site-container"
          style={{
            paddingTop: "50px",
            paddingBottom: "80px",
          }}
        >
          <div
            className="card"
            style={{
              padding: "32px",
              maxWidth: "650px",
            }}
          >
            <div className="eyebrow">F1 MEDİPOL · ADMIN</div>

            <h1>Yetkisiz Erişim</h1>

            <p style={{ color: "#9da8b5" }}>
              Bu bölüm yalnızca yöneticiler tarafından kullanılabilir.
            </p>

            <a href="/" className="btn">
              Ana Sayfaya Dön
            </a>
          </div>
        </main>
      </>
    );
  }

  const admin = createAdminClient();

  const { data: events } = await admin
    .from("events")
    .select("id, is_published");

  const eventRows = events ?? [];

  const totalEvents = eventRows.length;

  const publishedEvents = eventRows.filter(
    (event) => event.is_published
  ).length;

  const draftEvents = eventRows.filter(
    (event) => !event.is_published
  ).length;

  const displayName =
    profile.display_name ||
    profile.username ||
    user.email?.split("@")[0] ||
    "Admin";

  return (
    <>
      <Header />

      <main
        className="site-container"
        style={{
          paddingTop: "32px",
          paddingBottom: "80px",
        }}
      >
        <section
          className="card"
          style={{
            padding: "32px",
            background:
              "radial-gradient(circle at 90% 10%,rgba(225,6,0,.15),transparent 32%),linear-gradient(145deg,#232b36,#171d26)",
          }}
        >
          <div className="eyebrow">
            F1 MEDİPOL · CONTROL CENTER
          </div>

          <h1
            style={{
              margin: "8px 0 6px",
              fontSize: "48px",
            }}
          >
            ADMIN PANELİ
          </h1>

          <p
            style={{
              margin: 0,
              color: "#9da8b5",
            }}
          >
            Hoş geldin, {displayName}.
          </p>

          <div
            style={{
              display: "inline-block",
              marginTop: "18px",
              padding: "8px 12px",
              borderRadius: "999px",
              background: "rgba(53,212,119,.10)",
              border: "1px solid rgba(53,212,119,.22)",
              color: "#65df96",
              fontSize: "9px",
              fontWeight: 900,
            }}
          >
            ● YÖNETİCİ OTURUMU AKTİF
          </div>
        </section>

        <section
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: "12px",
          }}
        >
          <div className="card" style={{ padding: "20px" }}>
            <div className="eyebrow">TOPLAM</div>

            <div
              style={{
                marginTop: "7px",
                fontSize: "34px",
                fontWeight: 900,
              }}
            >
              {totalEvents}
            </div>

            <div
              style={{
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Etkinlik
            </div>
          </div>

          <div className="card" style={{ padding: "20px" }}>
            <div className="eyebrow">YAYINDA</div>

            <div
              style={{
                marginTop: "7px",
                fontSize: "34px",
                fontWeight: 900,
              }}
            >
              {publishedEvents}
            </div>

            <div
              style={{
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Yayınlanmış etkinlik
            </div>
          </div>

          <div className="card" style={{ padding: "20px" }}>
            <div className="eyebrow">TASLAK</div>

            <div
              style={{
                marginTop: "7px",
                fontSize: "34px",
                fontWeight: 900,
              }}
            >
              {draftEvents}
            </div>

            <div
              style={{
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Yayınlanmamış etkinlik
            </div>
          </div>
        </section>

        <section style={{ marginTop: "32px" }}>
          <div className="eyebrow">YÖNETİM MODÜLLERİ</div>

          <h2
            style={{
              margin: "7px 0 17px",
              fontSize: "30px",
            }}
          >
            Kontrol Merkezi
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: "14px",
            }}
          >
            <a
              href="/admin/events"
              className="card"
              style={{
                padding: "24px",
                minHeight: "180px",
              }}
            >
              <div style={{ fontSize: "34px" }}>🏁</div>

              <div
                className="eyebrow"
                style={{ marginTop: "18px" }}
              >
                ACTIVE MODULE
              </div>

              <h3
                style={{
                  margin: "7px 0",
                  fontSize: "24px",
                }}
              >
                Etkinlik Yönetimi
              </h3>

              <p
                style={{
                  color: "#8995a3",
                  fontSize: "11px",
                }}
              >
                Etkinlikleri oluştur, yayınla ve yönet.
              </p>

              <div
                style={{
                  marginTop: "18px",
                  color: "#ff625b",
                  fontSize: "10px",
                  fontWeight: 900,
                }}
              >
                PANELE GİT →
              </div>
            </a>

            <div
              className="card"
              style={{
                padding: "24px",
                minHeight: "180px",
                opacity: 0.5,
              }}
            >
              <div style={{ fontSize: "34px" }}>📸</div>

              <h3>Galeri Yönetimi</h3>

              <p style={{ color: "#8995a3" }}>
                Yakında eklenecek.
              </p>
            </div>

            <div
              className="card"
              style={{
                padding: "24px",
                minHeight: "180px",
                opacity: 0.5,
              }}
            >
              <div style={{ fontSize: "34px" }}>👥</div>

              <h3>Yönetim Kurulu</h3>

              <p style={{ color: "#8995a3" }}>
                Yakında eklenecek.
              </p>
            </div>

            <div
              className="card"
              style={{
                padding: "24px",
                minHeight: "180px",
                opacity: 0.5,
              }}
            >
              <div style={{ fontSize: "34px" }}>⚙️</div>

              <h3>Site Yönetimi</h3>

              <p style={{ color: "#8995a3" }}>
                Yakında eklenecek.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}