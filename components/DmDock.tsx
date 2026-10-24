
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import MessagesClient from "./MessagesClient";

export default function DmDock({
  isLight = false,
}: {
  isLight?: boolean;
}) {
  const supabase = useRef(createClient()).current;

  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    let alive = true;

    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!alive) return;

      setLoggedIn(Boolean(data.user));
      setReady(true);
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;

      setLoggedIn(Boolean(session?.user));
      setShowLoginPrompt(false);
      setReady(true);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!ready) return null;

  if (loggedIn) {
    return <MessagesClient isLight={isLight} />;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Mesajlar — giriş yapmalısın"
        title="Mesajlar için giriş yap"
        onClick={() => setShowLoginPrompt((value) => !value)}
        style={{
          position: "fixed",
          right: "max(20px, env(safe-area-inset-right))",
          bottom: "max(20px, env(safe-area-inset-bottom))",
          zIndex: 9990,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.22)",
          background: "#e10600",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 28px rgba(225,6,0,.38)",
        }}
      >
        <svg
          width="27"
          height="27"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 2 11 13" />
          <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        </svg>
      </button>

      {showLoginPrompt ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="dm-login-title"
          style={{
            position: "fixed",
            right: "max(16px, env(safe-area-inset-right))",
            bottom: "max(90px, calc(env(safe-area-inset-bottom) + 82px))",
            zIndex: 9991,
            width: "min(320px, calc(100vw - 32px))",
            boxSizing: "border-box",
            padding: 20,
            borderRadius: 18,
            border: "1px solid rgba(225,6,0,.35)",
            background: isLight ? "#fff" : "#17191f",
            color: isLight ? "#171717" : "#fff",
            boxShadow: "0 18px 55px rgba(0,0,0,.3)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <span style={{ color: "#e10600", display: "flex" }}>
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="11" width="16" height="11" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </span>

            <strong id="dm-login-title" style={{ fontSize: 16 }}>
              Sohbet kilitli
            </strong>

            <button
              type="button"
              aria-label="Uyarıyı kapat"
              onClick={() => setShowLoginPrompt(false)}
              style={{
                marginLeft: "auto",
                border: 0,
                background: "transparent",
                color: "inherit",
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              opacity: 0.8,
              margin: "0 0 16px",
            }}
          >
            Mesaj göndermek, arkadaşlarını bulmak ve sohbet isteklerini görmek
            için F1 Medipol hesabına giriş yapmalısın.
          </p>

          <a
            href="/login"
            style={{
              minHeight: 42,
              padding: "0 16px",
              borderRadius: 11,
              background: "#e10600",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            Giriş Yap
          </a>

          <button
            type="button"
            onClick={() => setShowLoginPrompt(false)}
            style={{
              width: "100%",
              marginTop: 9,
              padding: "9px 12px",
              border: 0,
              background: "transparent",
              color: "inherit",
              opacity: 0.7,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Şimdilik vazgeç
          </button>
        </div>
      ) : null}
    </>
  );
}
