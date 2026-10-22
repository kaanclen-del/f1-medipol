"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ProfileActions() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      alert("Çıkış yapılamadı. Lütfen tekrar deneyin.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <div style={{ marginTop: 0 }}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="btn"
        style={{
          width: "auto",
          minHeight: "32px",
          padding: "0 11px",
          border: "1px solid rgba(255,90,80,.4)",
          borderRadius: "8px",
          background: "rgba(225,6,0,.12)",
          color: "#ff6b65",
          fontSize: "12px",
          fontWeight: 800,
          lineHeight: 1.2,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Çıkış yapılıyor..." : "Çıkış Yap"}
      </button>
    </div>
  );
}
