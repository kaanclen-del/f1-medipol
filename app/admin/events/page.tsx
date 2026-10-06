import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  start_at: string;
  location_name: string | null;
  is_published: boolean;
  featured: boolean;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(date));
}

export default async function AdminEventsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />

        <main className="site-container" style={{ paddingTop: "50px" }}>
          <div className="card" style={{ padding: "30px" }}>
            <div className="eyebrow">ADMIN</div>

            <h1>Giriş gerekli</h1>

            <p style={{ color: "#9da8b5" }}>
              Bu sayfayı görüntülemek için giriş yapmalısın.
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
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return (
      <>
        <Header />

        <main className="site-container" style={{ paddingTop: "50px" }}>
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

  const { data } = await admin
    .from("events")
    .select(
      `
      id,
      title,
      event_type,
      start_at,
      location_name,
      is_published,
      featured
      `
    )
    .order("start_at", {
      ascending: false,
    });

  const events = (data ?? []) as EventRow[];

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
        <div className="eyebrow">F1 MEDİPOL · ADMIN</div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: "20px",
            marginTop: "6px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "46px",
                letterSpacing: "-.04em",
              }}
            >
              Etkinlik Yönetimi
            </h1>

            <p
              style={{
                color: "#8f9aa8",
                fontSize: "13px",
              }}
            >
              Etkinlikleri oluştur, yayınla ve yönet.
            </p>
          </div>

          <div
            style={{
              padding: "9px 13px",
              borderRadius: "999px",
              background: "rgba(53,212,119,.10)",
              border: "1px solid rgba(53,212,119,.25)",
              color: "#65df96",
              fontSize: "10px",
              fontWeight: 900,
            }}
          >
            ● ADMIN
          </div>
        </div>

        <section
          style={{
            marginTop: "26px",
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: "12px",
          }}
        >
          <div className="card" style={{ padding: "20px" }}>
            <div className="eyebrow">TOPLAM</div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 1000,
                marginTop: "7px",
              }}
            >
              {events.length}
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
                fontSize: "34px",
                fontWeight: 1000,
                marginTop: "7px",
              }}
            >
              {events.filter((event) => event.is_published).length}
            </div>

            <div
              style={{
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Yayınlanmış
            </div>
          </div>

          <div className="card" style={{ padding: "20px" }}>
            <div className="eyebrow">TASLAK</div>

            <div
              style={{
                fontSize: "34px",
                fontWeight: 1000,
                marginTop: "7px",
              }}
            >
              {events.filter((event) => !event.is_published).length}
            </div>

            <div
              style={{
                color: "#7f8b99",
                fontSize: "10px",
              }}
            >
              Yayınlanmamış
            </div>
          </div>
        </section>

        <section
          className="card"
          style={{
            marginTop: "16px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <div className="eyebrow">EVENT DATABASE</div>

            <h2
              style={{
                margin: "6px 0 0",
                fontSize: "23px",
              }}
            >
              Tüm Etkinlikler
            </h2>
          </div>

          {events.length === 0 ? (
            <div
              style={{
                minHeight: "220px",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: "30px",
              }}
            >
              <div>
                <div style={{ fontSize: "32px" }}>🏁</div>

                <h3 style={{ marginBottom: "7px" }}>
                  Henüz etkinlik yok
                </h3>

                <p
                  style={{
                    color: "#818d9b",
                    fontSize: "12px",
                  }}
                >
                  Bir sonraki adımda buraya etkinlik ekleme sistemi
                  koyacağız.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    minHeight: "82px",
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(255,255,255,.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "18px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        gap: "7px",
                        alignItems: "center",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "8px",
                          fontWeight: 900,
                          color: "#ff625b",
                        }}
                      >
                        {event.event_type.toUpperCase()}
                      </span>

                      {event.featured && (
                        <span
                          style={{
                            fontSize: "8px",
                            fontWeight: 900,
                          }}
                        >
                          ★ ÖNE ÇIKAN
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: "15px",
                      }}
                    >
                      {event.title}
                    </div>

                    <div
                      style={{
                        color: "#7f8b99",
                        fontSize: "10px",
                        marginTop: "5px",
                      }}
                    >
                      {formatDate(event.start_at)}

                      {event.location_name
                        ? ` · ${event.location_name}`
                        : ""}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "7px 10px",
                      borderRadius: "999px",
                      fontSize: "8px",
                      fontWeight: 1000,
                      color: event.is_published
                        ? "#65df96"
                        : "#a6b0bd",
                      background: event.is_published
                        ? "rgba(53,212,119,.10)"
                        : "rgba(255,255,255,.06)",
                      border: event.is_published
                        ? "1px solid rgba(53,212,119,.20)"
                        : "1px solid rgba(255,255,255,.08)",
                    }}
                  >
                    {event.is_published ? "YAYINDA" : "TASLAK"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}