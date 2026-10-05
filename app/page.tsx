export default function Home() {
  return (
    <main>
      {/* NAVBAR */}
      <header
        style={{
          height: "78px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          background: "rgba(17,21,29,.92)",
          backdropFilter: "blur(18px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="site-container"
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: "28px",
          }}
        >
<div
  style={{
    width: "245px",
    height: "56px",
    overflow: "hidden",
    borderRadius: "10px",
    background: "white",
    marginRight: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <img
    src="/f1-medipol-logo.jpg"
    alt="F1 Medipol"
    style={{
      width: "245px",
      maxWidth: "none",
      height: "auto",
      transform: "translateY(1px)",
    }}
  />
</div>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: "22px",
              fontSize: "13px",
              fontWeight: 800,
              color: "#b8c1cc",
            }}
          >
            <a style={{ color: "white" }}>Ana Sayfa</a>
            <a>Canlı</a>
            <a>Tahmin</a>
            <a>Etkinlikler</a>
            <a>Galeri</a>
            <a>Yönetim Kurulu</a>
            <a>Paddock</a>
            <a>Arcade</a>
          </nav>

          <button
            className="btn btn-red"
            style={{ marginLeft: "auto" }}
          >
            Oturum Aç
          </button>
        </div>
      </header>

      <div className="site-container" style={{ paddingTop: "24px" }}>
        {/* TICKER */}
        <div
          style={{
            padding: "10px 16px",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: "12px",
            background: "rgba(255,255,255,.025)",
            display: "flex",
            gap: "22px",
            alignItems: "center",
            overflow: "hidden",
            fontSize: "12px",
          }}
        >
          <b style={{ color: "#ff5149" }}>F1 MEDİPOL</b>

          <span style={{ color: "#aeb8c4" }}>
            Singapore GP · Round 17
          </span>

          <span style={{ color: "#aeb8c4" }}>
            Sprint Weekend
          </span>

          <span style={{ color: "#aeb8c4" }}>
            9–11 Ekim
          </span>
        </div>

        {/* HERO */}
        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: "1.55fr .7fr",
            gap: "14px",
          }}
        >
          <div
            className="card"
            style={{
              minHeight: "540px",
              padding: "42px",
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(circle at 80% 20%, rgba(225,6,0,.30), transparent 30%), linear-gradient(135deg,#351d25,#1a2330 65%,#12171f)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "-20px",
                top: "-35px",
                fontSize: "190px",
                fontWeight: 1000,
                color: "rgba(255,255,255,.035)",
                fontStyle: "italic",
              }}
            >
              17
            </div>

            <div className="eyebrow">
              ROUND 17 · MARINA BAY
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "14px",
              }}
            >
              {["NIGHT RACE", "SPRINT WEEKEND", "09–11 EKİM"].map(
                (item) => (
                  <span
                    key={item}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.04)",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    {item}
                  </span>
                ),
              )}
            </div>

            <h1
              style={{
                fontSize: "76px",
                lineHeight: ".9",
                margin: "42px 0 15px",
                letterSpacing: "-.055em",
              }}
            >
              SINGAPORE
              <br />
              <span style={{ color: "#ff4942" }}>
                GRAND PRIX
              </span>
            </h1>

            <p
              style={{
                color: "#aeb8c4",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: ".1em",
              }}
            >
              SIRADAKİ F1 HAFTA SONU
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                margin: "28px 0",
              }}
            >
              {[
                ["04", "GÜN"],
                ["14", "SAAT"],
                ["32", "DAK"],
                ["18", "SN"],
              ].map(([n, l]) => (
                <div
                  key={l}
                  style={{
                    width: "88px",
                    padding: "13px",
                    textAlign: "center",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,.09)",
                    background: "rgba(10,14,20,.36)",
                  }}
                >
                  <b
                    style={{
                      display: "block",
                      fontSize: "25px",
                    }}
                  >
                    {n}
                  </b>

                  <small
                    style={{
                      color: "#8995a4",
                      fontSize: "9px",
                    }}
                  >
                    {l}
                  </small>
                </div>
              ))}
            </div>

            <button className="btn btn-red">
              Yarış Merkezine Git →
            </button>
          </div>

          {/* QUICK INTEL */}
          <aside
            className="card"
            style={{
              padding: "25px",
              minHeight: "540px",
              background:
                "linear-gradient(145deg,#262d39,#171d26)",
            }}
          >
            <div className="eyebrow">
              YARIŞA GİRMEDEN ÖNCE
            </div>

            <h2
              style={{
                fontSize: "32px",
                margin: "8px 0 24px",
              }}
            >
              QUICK INTEL
            </h2>

            {[
              ["PIT STRATEJİSİ", "1–2", "Safety Car stratejiyi değiştirebilir."],
              ["GEÇİŞ", "ZOR", "Marina Bay'de pist pozisyonu kritik."],
              ["FORM", "HAM", "Son yarıştan sonra güçlü momentum."],
              ["ŞAMPİYONA", "+84", "Antonelli liderliğini koruyor."],
            ].map(([title, value, text]) => (
              <div
                key={title}
                style={{
                  padding: "17px 0",
                  borderBottom:
                    "1px solid rgba(255,255,255,.07)",
                }}
              >
                <small
                  style={{
                    color: "#8995a4",
                    fontWeight: 900,
                  }}
                >
                  {title}
                </small>

                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 1000,
                    margin: "3px 0",
                  }}
                >
                  {value}
                </div>

                <span
                  style={{
                    color: "#abb5c1",
                    fontSize: "12px",
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </aside>
        </section>

        {/* ALT KARTLAR */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "14px",
            margin: "14px 0 60px",
          }}
        >
          {[
            [
              "CANLI YARIŞ MERKEZİ",
              "Canlı timing şu anda beklemede.",
              "Canlı Merkezi Aç",
            ],
            [
              "SINGAPORE TAHMİNİ",
              "Podyum ve Sprint tahminlerini oluştur.",
              "Tahmin Yap",
            ],
            [
              "PADDOCK NABZI",
              "Kulüp topluluğundaki son gelişmeleri gör.",
              "Paddock'a Git",
            ],
          ].map(([title, text, button]) => (
            <article
              className="card"
              key={title}
              style={{ padding: "22px" }}
            >
              <div className="eyebrow">{title}</div>

              <h3
                style={{
                  fontSize: "23px",
                  margin: "10px 0",
                }}
              >
                {text}
              </h3>

              <button className="btn">
                {button} →
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}