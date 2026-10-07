import { redirect } from "next/navigation";

import AdminGalleryForm from "@/components/AdminGalleryForm";
import AdminGalleryActions from "@/components/AdminGalleryActions";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
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

  const { data: images } = await admin
    .from("gallery_images")
    .select("*")
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: false,
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
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#888",
              marginBottom: "8px",
            }}
          >
            ADMIN PANELİ / GALERİ
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            Galeri Yönetimi
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#aaa",
            }}
          >
            Kulüp etkinliklerinden fotoğrafları
            galeriye yükleyebilir ve
            yönetebilirsin.
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
            Yeni Görsel Ekle
          </h2>

          <AdminGalleryForm />
        </section>

        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              Galerideki Görseller
            </h2>

            <div
              style={{
                fontSize: "13px",
                color: "#888",
              }}
            >
              Toplam {images?.length ?? 0} görsel
            </div>
          </div>

          {!images || images.length === 0 ? (
            <div
              style={{
                padding: "30px",
                borderRadius: "12px",
                border: "1px dashed #333",
                color: "#888",
                textAlign: "center",
              }}
            >
              Henüz galeriye görsel eklenmemiş.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "18px",
              }}
            >
              {images.map((image) => (
                <article
                  key={image.id}
                  style={{
                    overflow: "hidden",
                    borderRadius: "12px",
                    border: "1px solid #242424",
                    background: "#101010",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "3 / 4",
                      background: "#161616",
                    }}
                  >
                    <img
                      src={image.image_url}
                      alt={
                        image.title ||
                        "Galeri görseli"
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <strong>
                        {image.title ||
                          "Başlıksız Görsel"}
                      </strong>

                      <span
                        style={{
                          fontSize: "11px",
                          padding: "4px 7px",
                          borderRadius: "999px",
                          background:
                            image.is_published
                              ? "#12351d"
                              : "#333",
                          color:
                            image.is_published
                              ? "#8ee5a5"
                              : "#aaa",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {image.is_published
                          ? "Yayında"
                          : "Taslak"}
                      </span>
                    </div>

                    {image.caption && (
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: "13px",
                          color: "#aaa",
                          lineHeight: 1.5,
                        }}
                      >
                        {image.caption}
                      </p>
                    )}

                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "12px",
                        color: "#666",
                      }}
                    >
                      Sıra: {image.sort_order}
                    </div>

                    <AdminGalleryActions
                      imageId={image.id}
                      imageTitle={image.title}
                      isPublished={
                        image.is_published
                      }
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