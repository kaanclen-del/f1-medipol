import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = await createClient();

  const { data: images, error } = await supabase
    .from("gallery_images")
    .select(
      `
        id,
        title,
        caption,
        image_url,
        sort_order,
        created_at
      `
    )
    .eq("is_published", true)
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
        padding: "50px 24px 90px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#c51f32",
              fontWeight: 700,
              letterSpacing: "1.5px",
              marginBottom: "10px",
            }}
          >
            MEDİPOL F1 KULÜBÜ
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(36px, 5vw, 58px)",
              lineHeight: 1,
            }}
          >
            Galeri
          </h1>

          <p
            style={{
              marginTop: "14px",
              color: "#999",
              maxWidth: "700px",
              lineHeight: 1.6,
              fontSize: "15px",
            }}
          >
            Etkinliklerimizden, yarış izleme
            organizasyonlarımızdan ve kulüp
            çalışmalarımızdan kareler.
          </p>
        </div>

        {error ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid #3a1c1c",
              background: "#160b0b",
              color: "#ffb0b0",
            }}
          >
            Galeri şu anda yüklenemiyor.
          </div>
        ) : !images || images.length === 0 ? (
          <div
            style={{
              padding: "45px 20px",
              borderRadius: "14px",
              border: "1px dashed #333",
              color: "#888",
              textAlign: "center",
            }}
          >
            Henüz yayınlanmış bir galeri görseli
            bulunmuyor.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(340px, 380px))",
              gap: "24px",
              justifyContent: "start",
            }}
          >
            {images.map((image) => (
              <article
                key={image.id}
                style={{
                  width: "100%",
                  overflow: "hidden",
                  borderRadius: "18px",
                  background: "#101010",
                  border: "1px solid #242424",
                  boxShadow:
                    "0 20px 50px rgba(0,0,0,0.35)",
                }}
              >
                <div
                  style={{
                    aspectRatio: "3 / 4",
                    background: "#151515",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={image.image_url}
                    alt={
                      image.title ||
                      "Medipol F1 Kulübü galeri görseli"
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>

                {(image.title || image.caption) && (
                  <div
                    style={{
                      padding: "18px 18px 20px",
                    }}
                  >
                    {image.title && (
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "19px",
                          fontWeight: 700,
                        }}
                      >
                        {image.title}
                      </h2>
                    )}

                    {image.caption && (
                      <p
                        style={{
                          margin:
                            image.title
                              ? "9px 0 0"
                              : 0,
                          color: "#999",
                          fontSize: "14px",
                          lineHeight: 1.6,
                        }}
                      >
                        {image.caption}
                      </p>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}