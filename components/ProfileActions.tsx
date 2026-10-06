"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ProfileActions() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <div
      style={{
        marginTop: "12px",
      }}
    >
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="btn"
        style={{
          width: "100%",
          minHeight: "42px",
          border: "1px solid rgba(255,90,80,.25)",
          background: "rgba(225,6,0,.08)",
          color: "#ff6b65",
          fontWeight: 900,
        }}
      >
        {loading ? "Çıkış yapılıyor..." : "Çıkış Yap"}
      </button>
    </div>
  );
}