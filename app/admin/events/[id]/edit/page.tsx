import { redirect } from "next/navigation";

import AdminEventEditForm from "@/components/AdminEventEditForm";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEventPage({
  params,
}: PageProps) {
  const { id } = await params;

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

  const { data: event, error } = await admin
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
    .eq("id", id)
    .single();

  if (error || !event) {
    redirect("/admin/events");
  }

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
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#888",
              marginBottom: "8px",
            }}
          >
            ADMIN PANELİ / ETKİNLİKLER
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            Etkinliği Düzenle
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#aaa",
            }}
          >
            Etkinlik bilgilerini değiştirip tekrar
            kaydedebilirsin.
          </p>
        </div>

        <AdminEventEditForm event={event} />
      </div>
    </main>
  );
}