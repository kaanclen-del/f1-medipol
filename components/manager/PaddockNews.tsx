"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Upgrade = {
  key: string;
  name: string;
  before: number;
  after: number;
};

type NewsItem = {
  id: string;

  round: number;

  bot_key: string;

  bot_name:
    | string
    | null;

  team_key: string;
  team_name: string;

  ai_difficulty:
    | string
    | null;

  difficulty_name: string;

  amount_spent: number;

  rating_before: number;
  rating_after: number;

  upgrades: Upgrade[];

  developed: boolean;
  message: string;

  created_at: string;
};

export default function PaddockNews({
  lobbyId,
}: {
  lobbyId: string;
}) {
  const [
    news,
    setNews,
  ] =
    useState<NewsItem[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    expanded,
    setExpanded,
  ] =
    useState(false);

  async function load() {
    try {
      const response =
        await fetch(
          `/api/arcade/manager/lobbies/${lobbyId}/paddock-news`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        return;
      }

      setNews(
        Array.isArray(
          result.news
        )
          ? result.news
          : []
      );
    } catch {
      /*
        Dashboard'un kendisini
        bu bölüm yüzünden bozma.
      */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const interval =
      window.setInterval(
        load,
        8000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [lobbyId]);

  const grouped =
    useMemo(() => {
      const result =
        new Map<
          number,
          NewsItem[]
        >();

      for (const item of
        news) {
        const list =
          result.get(
            item.round
          ) ?? [];

        list.push(item);

        result.set(
          item.round,
          list
        );
      }

      return [
        ...result.entries(),
      ].sort(
        (a, b) =>
          b[0] - a[0]
      );
    }, [news]);

  const visibleRounds =
    expanded
      ? grouped
      : grouped.slice(
          0,
          2
        );

  return (
    <section
      style={{
        marginBottom:
          "16px",

        border:
          "1px solid rgba(255,255,255,.075)",

        borderRadius:
          "18px",

        background:
          "rgba(255,255,255,.02)",

        overflow:
          "hidden",
      }}
    >
      <div
        style={{
          padding:
            "19px 20px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: "15px",

          borderBottom:
            "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div>
          <div
            style={{
              color:
                "#d2263d",

              fontSize:
                "9px",

              fontWeight:
                900,

              letterSpacing:
                "1.4px",
            }}
          >
            PADDOCK · R&D
          </div>

          <h2
            style={{
              margin:
                "6px 0 0",

              fontSize:
                "22px",
            }}
          >
            Paddock Haberleri
          </h2>

          <div
            style={{
              marginTop:
                "5px",

              color:
                "#69727b",

              fontSize:
                "9px",
            }}
          >
            Rakip takımların
            sezon içindeki
            geliştirme kararları.
          </div>
        </div>

        <div
          style={{
            padding:
              "7px 10px",

            border:
              "1px solid rgba(255,255,255,.07)",

            borderRadius:
              "8px",

            color:
              "#747d86",

            fontSize:
              "8px",

            fontWeight:
              900,
          }}
        >
          AI DEVELOPMENT
        </div>
      </div>

      {loading ? (
        <div
          style={{
            padding:
              "22px",

            color:
              "#636c75",

            fontSize:
              "10px",
          }}
        >
          Paddock verileri
          yükleniyor...
        </div>
      ) : grouped.length ===
        0 ? (
        <div
          style={{
            padding:
              "22px",

            color:
              "#626b74",

            fontSize:
              "10px",

            lineHeight:
              1.6,
          }}
        >
          Henüz AI R&D haberi
          yok. Bir sonraki yarış
          başladığında takımların
          geliştirme kararları
          burada görünmeye
          başlayacak.
        </div>
      ) : (
        <>
          {visibleRounds.map(
            ([
              round,
              items,
            ]) => (
              <div
                key={
                  round
                }
              >
                <div
                  style={{
                    padding:
                      "10px 20px",

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    background:
                      "rgba(255,255,255,.018)",

                    borderBottom:
                      "1px solid rgba(255,255,255,.045)",
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#858d96",

                      fontSize:
                        "9px",

                      letterSpacing:
                        ".9px",
                    }}
                  >
                    ROUND{" "}
                    {round}
                  </strong>

                  <span
                    style={{
                      color:
                        "#555e67",

                      fontSize:
                        "8px",
                    }}
                  >
                    {
                      items.filter(
                        (item) =>
                          item.developed
                      ).length
                    }{" "}
                    takım geliştirme
                    yaptı
                  </span>
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(280px,1fr))",

                    gap:
                      "1px",

                    background:
                      "rgba(255,255,255,.045)",
                  }}
                >
                  {items.map(
                    (item) => (
                      <NewsCard
                        key={
                          item.id
                        }

                        item={
                          item
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )
          )}

          {grouped.length >
            2 && (
            <button
              type="button"

              onClick={() =>
                setExpanded(
                  (value) =>
                    !value
                )
              }

              style={{
                width:
                  "100%",

                minHeight:
                  "44px",

                border: 0,

                borderTop:
                  "1px solid rgba(255,255,255,.055)",

                background:
                  "rgba(255,255,255,.015)",

                color:
                  "#8a929a",

                cursor:
                  "pointer",

                fontSize:
                  "9px",

                fontWeight:
                  900,
              }}
            >
              {expanded
                ? "ESKİ HABERLERİ GİZLE ↑"
                : "ÖNCEKİ ROUND'LARI GÖSTER ↓"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function NewsCard({
  item,
}: {
  item: NewsItem;
}) {
  return (
    <div
      style={{
        minHeight:
          "170px",

        padding:
          "17px",

        background:
          item.developed
            ? "linear-gradient(145deg,rgba(75,220,126,.035),#080808)"
            : "#080808",
      }}
    >
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          gap: "10px",

          alignItems:
            "flex-start",
        }}
      >
        <div>
          <div
            style={{
              color:
                item.developed
                  ? "#6be697"
                  : "#686f77",

              fontSize:
                "8px",

              fontWeight:
                900,

              letterSpacing:
                ".8px",
            }}
          >
            {item.developed
              ? "R&D UPDATE"
              : "NO DEVELOPMENT"}
          </div>

          <h3
            style={{
              margin:
                "5px 0 0",

              fontSize:
                "16px",
            }}
          >
            {
              item.team_name
            }
          </h3>
        </div>

        <div
          style={{
            padding:
              "4px 7px",

            borderRadius:
              "6px",

            background:
              "rgba(255,255,255,.04)",

            color:
              "#686f77",

            fontSize:
              "7px",

            fontWeight:
              900,
          }}
        >
          {
            item.difficulty_name
          }
        </div>
      </div>

      <div
        style={{
          marginTop:
            "11px",

          color:
            "#79818a",

          fontSize:
            "9px",

          lineHeight:
            1.45,
        }}
      >
        {item.message}
      </div>

      {item.developed ? (
        <>
          <div
            style={{
              display:
                "flex",

              gap: "6px",

              flexWrap:
                "wrap",

              marginTop:
                "12px",
            }}
          >
            {item.upgrades.map(
              (upgrade) => (
                <div
                  key={
                    upgrade.key
                  }

                  style={{
                    padding:
                      "6px 8px",

                    border:
                      "1px solid rgba(91,226,140,.16)",

                    borderRadius:
                      "7px",

                    background:
                      "rgba(91,226,140,.045)",

                    color:
                      "#8cebae",

                    fontSize:
                      "8px",

                    fontWeight:
                      900,
                  }}
                >
                  {
                    upgrade.name
                  }{" "}
                  Lv.
                  {
                    upgrade.before
                  }{" "}
                  →{" "}
                  {
                    upgrade.after
                  }
                </div>
              )
            )}
          </div>

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              gap: "10px",

              marginTop:
                "13px",

              paddingTop:
                "10px",

              borderTop:
                "1px solid rgba(255,255,255,.045)",
            }}
          >
            <div>
              <div
                style={
                  miniLabel
                }
              >
                HARCAMA
              </div>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "3px",

                  fontSize:
                    "11px",
                }}
              >
                {formatMoney(
                  item.amount_spent
                )}
              </strong>
            </div>

            <div
              style={{
                textAlign:
                  "right",
              }}
            >
              <div
                style={
                  miniLabel
                }
              >
                TEAM RATING
              </div>

              <strong
                style={{
                  display:
                    "block",

                  marginTop:
                    "3px",

                  color:
                    "#6be697",

                  fontSize:
                    "11px",
                }}
              >
                {
                  item.rating_before
                }{" "}
                →{" "}
                {
                  item.rating_after
                }
              </strong>
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            marginTop:
              "15px",

            color:
              "#4f575f",

            fontSize:
              "8px",
          }}
        >
          €0 harcama · araç
          paketi değişmedi
        </div>
      )}
    </div>
  );
}

function formatMoney(
  amount: number
) {
  if (
    amount >=
    1_000_000
  ) {
    const value =
      amount /
      1_000_000;

    return `€${Number.isInteger(
      value
    )
      ? value.toFixed(0)
      : value.toFixed(1)}M`;
  }

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "EUR",

      maximumFractionDigits:
        0,
    }
  ).format(
    amount
  );
}

const miniLabel = {
  color: "#59616a",

  fontSize: "7px",

  fontWeight: 900,

  letterSpacing:
    ".7px",
};