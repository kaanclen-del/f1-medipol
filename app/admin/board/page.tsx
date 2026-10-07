import { redirect } from "next/navigation";

import AdminBoardForm from "@/components/AdminBoardForm";
import AdminBoardActions from "@/components/AdminBoardActions";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminBoardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: members } = await admin
    .from("board_members")
    .select("*")
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#fff",
        padding: "40px 24px 80px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "13px",
              color: "#888",
              marginBottom: "8px",
            }}
          >
            ADMIN PANELİ / YÖNETİM KURULU
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            Yönetim Kurulu Yönetimi
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#aaa",
              maxWidth: "700px",
              lineHeight: 1.6,
            }}
          >
            Dikey kart ve geniş açılış görsellerini
            yükleyebilir, yayın durumunu değiştirebilir
            veya kayıtları silebilirsin.
          </p>
        </div>

        <section
          style={{
            marginBottom: "50px",
            padding: "24px",
            borderRadius: "14px",
            border: "1px solid #242424",
            background: "#0d0d0d",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "22px",
              fontSize: "22px",
            }}
          >
            Yeni Yönetim Kurulu Kartı
          </h2>

          <AdminBoardForm />
        </section>

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              Yönetim Kurulu
            </h2>

            <div
              style={{
                fontSize: "13px",
                color: "#888",
              }}
            >
              Toplam {members?.length ?? 0} kart
            </div>
          </div>

          {!members || members.length === 0 ? (
            <div
              style={{
                padding: "35px 20px",
                borderRadius: "12px",
                border: "1px dashed #333",
                color: "#888",
                textAlign: "center",
              }}
            >
              Henüz yönetim kurulu kartı eklenmemiş.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(260px, 300px))",
                gap: "22px",
                alignItems: "start",
              }}
            >
              {members.map((member) => (
                <article
                  key={member.id}
                  style={{
                    overflow: "hidden",
                    borderRadius: "14px",
                    border: "1px solid #242424",
                    background: "#101010",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "3 / 4",
                      background: "#151515",
                      overflow: "hidden",
                    }}
                  >
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={
                          member.name ||
                          "Yönetim kurulu görseli"
                        }
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#666",
                        }}
                      >
                        Görsel yok
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "14px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <div>
                        {member.name && (
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "16px",
                            }}
                          >
                            {member.name}
                          </div>
                        )}

                        {member.role && (
                          <div
                            style={{
                              marginTop: "4px",
                              color: "#aaa",
                              fontSize: "13px",
                            }}
                          >
                            {member.role}
                          </div>
                        )}

                        {!member.name && !member.role && (
                          <div
                            style={{
                              color: "#777",
                              fontSize: "13px",
                            }}
                          >
                            Sadece görsel
                          </div>
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: "11px",
                          padding: "4px 7px",
                          borderRadius: "999px",
                          background: member.is_published
                            ? "#12351d"
                            : "#333",
                          color: member.is_published
                            ? "#8ee5a5"
                            : "#aaa",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.is_published
                          ? "Yayında"
                          : "Taslak"}
                      </span>
                    </div>

                    {member.detail_image_url ? (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#151515",
                          border: "1px solid #262626",
                          fontSize: "12px",
                          color: "#8ee5a5",
                        }}
                      >
                        Geniş görsel hazır
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#171313",
                          border: "1px solid #352426",
                          fontSize: "12px",
                          color: "#b88",
                        }}
                      >
                        Geniş görsel yok
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "12px",
                        color: "#666",
                      }}
                    >
                      Sıra: {member.sort_order}
                    </div>

                    <AdminBoardActions
                      memberId={member.id}
                      memberName={member.name}
                      isPublished={member.is_published}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}