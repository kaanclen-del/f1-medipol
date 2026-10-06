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

            <h1
              style={{
                margin: "8px 0",
                fontSize: "38px",
              }}
            >
              Giriş Gerekli
            </h1>

            <p
              style={{
                color: "#9da8b5",
                lineHeight: 1.7,
              }}
            >
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
              padding: "35px",
              maxWidth: "650px",
            }}
          >
            <div className="eyebrow">F1 MEDİPOL · ADMIN</div>

            <h1
              style={{
                margin: "8px 0",
                fontSize: "38px",
              }}
            >
              Yetkisiz Erişim
            </h1>

            <p
              style={{
                color: "#9da8b5",
                lineHeight: 1.7,
              }}
            >
              Bu bölüm yalnızca yetkili yöneticiler tarafından
              görüntülenebilir.
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
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 90% 10%,rgba(225,6,0,.15),transparent 32%),linear-gradient(145deg,#232b36,#171d26)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "-45px",
              top: "-70px",
              width: "230px",
              height: "230px",
              borderRadius: "50%",
              border: "1px solid rgba(225,6,0,.15)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
            }}
          >
            <div className="eyebrow">
              F1 MEDİPOL · CONTROL CENTER
            </div>

            <h1
              style={{
                margin: "8px 0 6px",
                fontSize: "48px",
                letterSpacing: "-.05em",
              }}
            >
              ADMIN PANELİ
            </h1>

            <p
              style={{
                margin: 0,
                color: "#9da8b5",
                fontSize: "13px",
                lineHeight: 1.7,
              }}
            >
              Hoş geldin, {displayName}. Kulüp platformunun yönetim
              merkezi.
            </p>

            <div
              style={{
                marginTop: "20px",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 12px",
                borderRadius: "999px",
                background: "rgba(53,212,119,.10)",
                border: "1px solid rgba(53,212,119,.22)",
                color: "#65df96",
                fontSize: "9px",
                fontWeight: 1000,
              }}
            >
              ● YÖNETİCİ OTURUMU AKTİF
            </div>
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
          <div
            className="card"
            style={{
              padding: "20px",
            }}
          >
            <div className="eyebrow">ETKİNLİK</div>

            <div
              style={{
                marginTop: "7px",
                fontSize: "34px",
                fontWeight: 1000,
              }}
            >
              {totalEvents}
            </div>

            <div
              style={{
                marginTop: "3px",
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Toplam etkinlik
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "20px",
            }}
          >
            <div className="eyebrow">YAYINDA</div>

            <div
              style={{
                marginTop: "7px",
                fontSize: "34px",
                fontWeight: 1000,
              }}
            >
              {publishedEvents}
            </div>

            <div
              style={{
                marginTop: "3px",
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Yayınlanmış etkinlik
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "20px",
            }}
          >
            <div className="eyebrow">TASLAK</div>

            <div
              style={{
                marginTop: "7px",
                fontSize: "34px",
                fontWeight: 1000,
              }}
            >
              {draftEvents}
            </div>

            <div
              style={{
                marginTop: "3px",
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Bekleyen etkinlik
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: "32px",
          }}
        >
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
                minHeight: "190px",
                position: "relative",
                overflow: "hidden",
                transition: ".2s",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "22px",
                }}
              >
                🏁
              </div>

              <div className="eyebrow">ACTIVE MODULE</div>

              <h3
                style={{
                  margin: "6px 0 7px",
                  fontSize: "25px",
                }}
              >
                Etkinlik Yönetimi
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#8995a3",
                  fontSize: "11px",
                  lineHeight: 1.6,
                }}
              >
                Etkinlikleri oluştur, yayınla, düzenle ve yönet.
              </p>

              <div
                style={{
                  marginTop: "18px",
                  color: "#ff625b",
                  fontSize: "10px",
                  fontWeight: 1000,
                }}
              >
                PANELE GİT →
              </div>
            </a>

            <div
              className="card"
              style={{
                padding: "24px",
                minHeight: "190px",
                opacity: 0.55,
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "22px",
                }}
              >
                📸
              </div>

              <div className="eyebrow">COMING SOON</div>

              <h3
                style={{
                  margin: "6px 0 7px",
                  fontSize: "25px",
                }}
              >
                Galeri Yönetimi
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#8995a3",
                  fontSize: "11px",
                  lineHeight: 1.6,
                }}
              >
                Kulüp fotoğrafları ve albümleri burada yönetilecek.
              </p>
            </div>

            <div
              className="card"
              style={{
                padding: "24px",
                minHeight: "190px",
                opacity: 0.55,
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "22px",
                }}
              >
                👥
              </div>

              <div className="eyebrow">COMING SOON</div>

              <h3
                style={{
                  margin: "6px 0 7px",
                  fontSize: "25px",
                }}
              >
                Yönetim Kurulu
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#8995a3",
                  fontSize: "11px",
                  lineHeight: 1.6,
                }}
              >
                Yönetim kurulu üyeleri ve görevleri burada yönetilecek.
              </p>
            </div>

            <div
              className="card"
              style={{
                padding: "24px",
                minHeight: "190px",
                opacity: 0.55,
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "22px",
                }}
              >
                ⚙️
              </div>

              <div className="eyebrow">COMING SOON</div>

              <h3
                style={{
                  margin: "6px 0 7px",
                  fontSize: "25px",
                }}
              >
                Site Yönetimi
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#8995a3",
                  fontSize: "11px",
                  lineHeight: 1.6,
                }}
              >
                Paddock, duyurular ve diğer içerikler buradan yönetilecek.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}