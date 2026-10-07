import BoardShowcase from "@/components/BoardShowcase";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("board_members")
    .select(
      `
        id,
        name,
        role,
        bio,
        image_url,
        detail_image_url,
        instagram_url,
        linkedin_url,
        sort_order
      `
    )
    .eq("is_published", true)
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
        background:
          "radial-gradient(circle at top, #181010 0%, #080808 42%, #050505 100%)",
        color: "#fff",
        padding: "52px 24px 100px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "44px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              color: "#d2263d",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "2px",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                width: "34px",
                height: "2px",
                background: "#d2263d",
                display: "block",
              }}
            />

            MEDİPOL F1 KULÜBÜ
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(38px, 6vw, 72px)",
              lineHeight: 0.95,
              letterSpacing: "-2px",
            }}
          >
            Yönetim Kurulu
          </h1>

          <p
            style={{
              marginTop: "18px",
              marginBottom: 0,
              color: "#8f8f8f",
              fontSize: "15px",
              lineHeight: 1.7,
              maxWidth: "680px",
            }}
          >
            İstanbul Medipol Üniversitesi F1
            Kulübü yönetim ekibini keşfet.
            Kartlardan birine tıklayarak geniş
            görünüme geçebilirsin.
          </p>
        </header>

        {error ? (
          <div
            style={{
              padding: "28px",
              borderRadius: "14px",
              border: "1px solid #421d22",
              background: "#170b0d",
              color: "#ffb5bf",
            }}
          >
            Yönetim kurulu şu anda
            yüklenemiyor.
          </div>
        ) : (
          <BoardShowcase
            members={members ?? []}
          />
        )}
      </div>
    </main>
  );
}