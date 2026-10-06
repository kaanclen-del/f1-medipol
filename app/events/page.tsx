import Header from "@/components/Header";

import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;

  title: string;
  description: string | null;

  event_type:
    | "watch_party"
    | "karting"
    | "talk"
    | "club"
    | "other";

  location_name: string | null;
  location_address: string | null;

  start_at: string;
  end_at: string | null;

  cover_image_url: string | null;
  registration_url: string | null;

  featured: boolean;
  is_published: boolean;
};

function getEventTypeLabel(
  type: EventRow["event_type"]
) {
  switch (type) {
    case "watch_party":
      return "YARIŞ İZLEME";

    case "karting":
      return "KARTING";

    case "talk":
      return "SÖYLEŞİ";

    case "club":
      return "KULÜP";

    default:
      return "ETKİNLİK";
  }
}

function formatEventDate(
  date: string
) {
  try {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    ).format(
      new Date(date)
    );
  } catch {
    return date;
  }
}

function formatEventTime(
  date: string
) {
  try {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        hour: "2-digit",
        minute: "2-digit",
        timeZone:
          "Europe/Istanbul",
      }
    ).format(
      new Date(date)
    );
  } catch {
    return "";
  }
}

export default async function EventsPage() {
  const supabase =
    await createClient();

  const {
    data,
  } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      description,
      event_type,
      location_name,
      location_address,
      start_at,
      end_at,
      cover_image_url,
      registration_url,
      featured,
      is_published
      `
    )
    .eq(
      "is_published",
      true
    )
    .order(
      "start_at",
      {
        ascending: true,
      }
    );

  const events =
    (data ?? []) as EventRow[];

  const now =
    Date.now();

  const upcomingEvents =
    events.filter(
      (event) =>
        new Date(
          event.start_at
        ).getTime() >= now
    );

  const pastEvents =
    events.filter(
      (event) =>
        new Date(
          event.start_at
        ).getTime() < now
    );

  const featuredEvent =
    upcomingEvents.find(
      (event) =>
        event.featured
    ) ??
    upcomingEvents[0] ??
    null;

  const regularUpcoming =
    featuredEvent
      ? upcomingEvents.filter(
          (event) =>
            event.id !==
            featuredEvent.id
        )
      : upcomingEvents;

  return (
    <>
      <Header />

      <main>
        <div
          className="site-container"
          style={{
            paddingTop:
              "30px",

            paddingBottom:
              "80px",
          }}
        >
          {/* BAŞLIK */}

          <div className="eyebrow">
            F1 MEDİPOL · EVENTS
          </div>

          <h1
            style={{
              margin:
                "8px 0 5px",

              fontSize:
                "52px",

              letterSpacing:
                "-.05em",
            }}
          >
            ETKİNLİKLER
          </h1>

          <p
            style={{
              margin: 0,

              maxWidth:
                "650px",

              color:
                "#929dab",

              fontSize:
                "13px",

              lineHeight:
                1.7,
            }}
          >
            Yarış izleme
            etkinlikleri,
            karting buluşmaları,
            söyleşiler ve kulüp
            organizasyonları.
          </p>

          {/* ÖNE ÇIKAN */}

          {featuredEvent && (
            <section
              className="card"
              style={{
                minHeight:
                  "430px",

                marginTop:
                  "26px",

                position:
                  "relative",

                overflow:
                  "hidden",

                isolation:
                  "isolate",

                padding:
                  "38px",

                display:
                  "flex",

                alignItems:
                  "flex-end",

                background:
                  "linear-gradient(135deg,#2a2025,#18212b)",
              }}
            >
              {/* FOTOĞRAF */}

              {featuredEvent.cover_image_url && (
                <img
                  src={
                    featuredEvent.cover_image_url
                  }
                  alt={
                    featuredEvent.title
                  }
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    width:
                      "100%",

                    height:
                      "100%",

                    objectFit:
                      "cover",

                    zIndex:
                      -3,
                  }}
                />
              )}

              {/* OVERLAY */}

              <div
                style={{
                  position:
                    "absolute",

                  inset: 0,

                  zIndex:
                    -2,

                  background:
                    "linear-gradient(90deg,rgba(12,15,20,.96) 0%,rgba(12,15,20,.82) 48%,rgba(12,15,20,.35) 100%)",
                }}
              />

              <div
                style={{
                  position:
                    "absolute",

                  inset: 0,

                  zIndex:
                    -1,

                  background:
                    "linear-gradient(transparent 40%,rgba(10,13,18,.92))",
                }}
              />

              <div
                style={{
                  maxWidth:
                    "720px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",

                    gap: "8px",

                    flexWrap:
                      "wrap",

                    marginBottom:
                      "16px",
                  }}
                >
                  <span
                    style={{
                      padding:
                        "7px 10px",

                      borderRadius:
                        "999px",

                      background:
                        "#e10600",

                      fontSize:
                        "9px",

                      fontWeight:
                        1000,
                    }}
                  >
                    ÖNE ÇIKAN
                  </span>

                  <span
                    style={{
                      padding:
                        "7px 10px",

                      borderRadius:
                        "999px",

                      border:
                        "1px solid rgba(255,255,255,.13)",

                      background:
                        "rgba(0,0,0,.30)",

                      fontSize:
                        "9px",

                      fontWeight:
                        1000,
                    }}
                  >
                    {getEventTypeLabel(
                      featuredEvent.event_type
                    )}
                  </span>
                </div>

                <h2
                  style={{
                    margin: 0,

                    fontSize:
                      "44px",

                    lineHeight:
                      1.05,

                    letterSpacing:
                      "-.04em",
                  }}
                >
                  {
                    featuredEvent.title
                  }
                </h2>

                <div
                  style={{
                    marginTop:
                      "16px",

                    display:
                      "flex",

                    gap:
                      "18px",

                    flexWrap:
                      "wrap",

                    color:
                      "#c4ccd6",

                    fontSize:
                      "12px",

                    fontWeight:
                      800,
                  }}
                >
                  <span>
                    📅{" "}
                    {formatEventDate(
                      featuredEvent.start_at
                    )}
                  </span>

                  <span>
                    🕒{" "}
                    {formatEventTime(
                      featuredEvent.start_at
                    )}
                  </span>

                  {featuredEvent.location_name && (
                    <span>
                      📍{" "}
                      {
                        featuredEvent.location_name
                      }
                    </span>
                  )}
                </div>

                {featuredEvent.description && (
                  <p
                    style={{
                      maxWidth:
                        "620px",

                      margin:
                        "17px 0 0",

                      color:
                        "#aab4c0",

                      fontSize:
                        "13px",

                      lineHeight:
                        1.7,
                    }}
                  >
                    {
                      featuredEvent.description
                    }
                  </p>
                )}

                {featuredEvent.registration_url && (
                  <a
                    href={
                      featuredEvent.registration_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-red"
                    style={{
                      marginTop:
                        "22px",

                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",
                    }}
                  >
                    Etkinliğe Katıl →
                  </a>
                )}
              </div>
            </section>
          )}

          {/* ETKİNLİK YOK */}

          {events.length ===
            0 && (
            <section
              className="card"
              style={{
                marginTop:
                  "26px",

                minHeight:
                  "380px",

                padding:
                  "35px",

                display:
                  "grid",

                placeItems:
                  "center",

                textAlign:
                  "center",

                background:
                  "radial-gradient(circle at 50% 20%,rgba(225,6,0,.12),transparent 35%),linear-gradient(145deg,#232b36,#171d26)",
              }}
            >
              <div
                style={{
                  maxWidth:
                    "500px",
                }}
              >
                <div
                  style={{
                    width:
                      "72px",

                    height:
                      "72px",

                    margin:
                      "0 auto 20px",

                    borderRadius:
                      "20px",

                    display:
                      "grid",

                    placeItems:
                      "center",

                    background:
                      "rgba(225,6,0,.10)",

                    border:
                      "1px solid rgba(225,6,0,.20)",

                    fontSize:
                      "30px",
                  }}
                >
                  🏁
                </div>

                <div className="eyebrow">
                  TAKVİM HAZIRLANIYOR
                </div>

                <h2
                  style={{
                    margin:
                      "8px 0 10px",

                    fontSize:
                      "30px",
                  }}
                >
                  Yeni etkinlikler
                  yakında burada.
                </h2>

                <p
                  style={{
                    margin: 0,

                    color:
                      "#8e9aa8",

                    fontSize:
                      "13px",

                    lineHeight:
                      1.7,
                  }}
                >
                  F1 Medipol
                  etkinlikleri
                  yayınlandığında bu
                  sayfada otomatik
                  olarak görünecek.
                </p>
              </div>
            </section>
          )}

          {/* YAKLAŞAN ETKİNLİKLER */}

          {regularUpcoming.length >
            0 && (
            <section
              style={{
                marginTop:
                  "30px",
              }}
            >
              <div className="eyebrow">
                UPCOMING
              </div>

              <h2
                style={{
                  margin:
                    "7px 0 17px",

                  fontSize:
                    "30px",
                }}
              >
                Yaklaşan Etkinlikler
              </h2>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(3,minmax(0,1fr))",

                  gap:
                    "14px",
                }}
              >
                {regularUpcoming.map(
                  (event) => (
                    <article
                      key={
                        event.id
                      }
                      className="card"
                      style={{
                        overflow:
                          "hidden",
                      }}
                    >
                      <div
                        style={{
                          height:
                            "185px",

                          position:
                            "relative",

                          background:
                            "linear-gradient(135deg,#322127,#1c2631)",
                        }}
                      >
                        {event.cover_image_url && (
                          <img
                            src={
                              event.cover_image_url
                            }
                            alt={
                              event.title
                            }
                            style={{
                              width:
                                "100%",

                              height:
                                "100%",

                              objectFit:
                                "cover",
                            }}
                          />
                        )}

                        <span
                          style={{
                            position:
                              "absolute",

                            top:
                              "12px",

                            left:
                              "12px",

                            padding:
                              "6px 9px",

                            borderRadius:
                              "999px",

                            background:
                              "rgba(10,13,18,.78)",

                            backdropFilter:
                              "blur(8px)",

                            fontSize:
                              "8px",

                            fontWeight:
                              1000,
                          }}
                        >
                          {getEventTypeLabel(
                            event.event_type
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          padding:
                            "19px",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#ff625b",

                            fontSize:
                              "9px",

                            fontWeight:
                              1000,
                          }}
                        >
                          {formatEventDate(
                            event.start_at
                          )}{" "}
                          ·{" "}
                          {formatEventTime(
                            event.start_at
                          )}
                        </div>

                        <h3
                          style={{
                            margin:
                              "8px 0",

                            fontSize:
                              "20px",
                          }}
                        >
                          {
                            event.title
                          }
                        </h3>

                        {event.location_name && (
                          <div
                            style={{
                              color:
                                "#8c98a6",

                              fontSize:
                                "10px",

                              marginBottom:
                                "9px",
                            }}
                          >
                            📍{" "}
                            {
                              event.location_name
                            }
                          </div>
                        )}

                        {event.description && (
                          <p
                            style={{
                              color:
                                "#8f9aa8",

                              fontSize:
                                "11px",

                              lineHeight:
                                1.6,

                              margin:
                                "0 0 16px",
                            }}
                          >
                            {
                              event.description
                            }
                          </p>
                        )}

                        {event.registration_url && (
                          <a
                            href={
                              event.registration_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="btn"
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "center",
                            }}
                          >
                            Detay / Kayıt →
                          </a>
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          )}

          {/* GEÇMİŞ ETKİNLİKLER */}

          {pastEvents.length >
            0 && (
            <section
              style={{
                marginTop:
                  "35px",
              }}
            >
              <div className="eyebrow">
                ARCHIVE
              </div>

              <h2
                style={{
                  margin:
                    "7px 0 17px",

                  fontSize:
                    "28px",
                }}
              >
                Geçmiş Etkinlikler
              </h2>

              <div
                style={{
                  display:
                    "grid",

                  gap: "9px",
                }}
              >
                {pastEvents.map(
                  (event) => (
                    <div
                      key={
                        event.id
                      }
                      className="card"
                      style={{
                        minHeight:
                          "80px",

                        padding:
                          "14px 18px",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "space-between",

                        gap:
                          "20px",

                        opacity:
                          .72,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              "9px",

                            color:
                              "#7f8a98",

                            fontWeight:
                              900,
                          }}
                        >
                          {getEventTypeLabel(
                            event.event_type
                          )}{" "}
                          ·{" "}
                          {formatEventDate(
                            event.start_at
                          )}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "5px",

                            fontWeight:
                              900,
                          }}
                        >
                          {
                            event.title
                          }
                        </div>
                      </div>

                      <span
                        style={{
                          color:
                            "#747f8d",

                          fontSize:
                            "10px",
                        }}
                      >
                        TAMAMLANDI
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}