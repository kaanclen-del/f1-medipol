import { createClient } from "@/utils/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { error } = await supabase
    .from("_connection_test")
    .select("*")
    .limit(1);

  const connected =
    !error ||
    error.message
      .toLowerCase()
      .includes("does not exist") ||
    error.message
      .toLowerCase()
      .includes("could not find");

  return (
    <main
      style={{
        padding: "50px",
        fontFamily: "Arial",
      }}
    >
      <h1>
        {connected
          ? "✅ Supabase bağlantısı çalışıyor"
          : "❌ Supabase bağlantı hatası"}
      </h1>

      {error && (
        <p>
          Test mesajı: {error.message}
        </p>
      )}
    </main>
  );
}