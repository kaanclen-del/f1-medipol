"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  createClient,
} from "@/utils/supabase/client";

export default function Header() {
  const [supabase] =
    useState(() =>
      createClient()
    );

  const [
    displayName,
    setDisplayName,
  ] =
    useState<string | null>(
      null
    );

  const [
    loadingUser,
    setLoadingUser,
  ] =
    useState(true);

  const navItems = [
    {
      label: "Canlı",
      href: "/live",
    },

    {
      label: "Tahmin",
      href: "/predict",
    },

    {
      label: "Liderlik",
      href: "/leaderboard",
    },

    {
      label: "Etkinlikler",
      href: "/events",
    },

    {
      label: "Galeri",
      href: "/gallery",
    },

    {
      label:
        "Yönetim Kurulu",
      href: "/team",
    },

    {
      label: "Paddock",
      href: "/paddock",
    },

    {
      label: "Arcade",
      href: "/arcade",
    },
  ];

  async function loadUser() {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setDisplayName(null);
      setLoadingUser(false);
      return;
    }

    const name =
      user.user_metadata
        ?.display_name ||
      user.email?.split(
        "@"
      )[0] ||
      "Kullanıcı";

    setDisplayName(name);
    setLoadingUser(false);
  }

  useEffect(() => {
    loadUser();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          loadUser();
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,

        height: "78px",

        display: "flex",
        alignItems: "center",

        borderBottom:
          "1px solid rgba(255,255,255,.08)",

        background:
          "rgba(15,19,26,.92)",

        backdropFilter:
          "blur(18px)",
      }}
    >
      <div
        className="site-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",

          gap: "24px",
          height: "100%",
        }}
      >
        {/* LOGO */}

        <a
          href="/"
          style={{
            width: "205px",
            height: "56px",

            overflow: "hidden",

            borderRadius:
              "10px",

            background: "#fff",

            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",

            flexShrink: 0,
          }}
        >
          <Image
            src="/f1-medipol-logo.jpg"
            alt="F1 Medipol"
            width={245}
            height={100}
            priority
            style={{
              width: "245px",
              maxWidth: "none",
              height: "auto",
              objectFit:
                "contain",
            }}
          />
        </a>

        {/* MENÜ */}

        <nav
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",

            gap: "4px",

            flex: 1,

            overflowX: "auto",
          }}
        >
          <a
            href="/"
            style={{
              padding:
                "10px 11px",

              borderRadius:
                "9px",

              color:
                "#c7ced7",

              fontSize:
                "12px",

              fontWeight:
                800,

              whiteSpace:
                "nowrap",

              textDecoration:
                "none",
            }}
          >
            Ana Sayfa
          </a>

          {navItems.map(
            (item) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                style={{
                  padding:
                    "10px 11px",

                  borderRadius:
                    "9px",

                  color:
                    "#c7ced7",

                  fontSize:
                    "12px",

                  fontWeight:
                    800,

                  whiteSpace:
                    "nowrap",

                  textDecoration:
                    "none",
                }}
              >
                {
                  item.label
                }
              </Link>
            )
          )}
        </nav>

        {/* HESAP */}

        {loadingUser ? (
          <div
            style={{
              minWidth:
                "92px",

              height:
                "42px",
            }}
          />
        ) : displayName ? (
          <Link
            href="/profile"
            style={{
              minHeight:
                "42px",

              padding:
                "0 14px",

              borderRadius:
                "10px",

              border:
                "1px solid rgba(255,255,255,.10)",

              background:
                "rgba(255,255,255,.045)",

              display:
                "flex",

              alignItems:
                "center",

              gap: "9px",

              flexShrink: 0,

              textDecoration:
                "none",

              color:
                "white",

              transition:
                ".2s",
            }}
          >
            <div
              style={{
                width:
                  "28px",

                height:
                  "28px",

                borderRadius:
                  "50%",

                background:
                  "linear-gradient(135deg,#e10600,#ff5149)",

                display:
                  "grid",

                placeItems:
                  "center",

                fontSize:
                  "11px",

                fontWeight:
                  1000,
              }}
            >
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>

            <span
              style={{
                fontSize:
                  "12px",

                fontWeight:
                  900,

                maxWidth:
                  "120px",

                overflow:
                  "hidden",

                textOverflow:
                  "ellipsis",

                whiteSpace:
                  "nowrap",
              }}
            >
              {displayName}
            </span>

            <span
              style={{
                color:
                  "#7f8996",

                fontSize:
                  "11px",

                marginLeft:
                  "2px",
              }}
            >
              ›
            </span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="btn"
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              flexShrink: 0,

              minWidth:
                "92px",
            }}
          >
            Giriş Yap
          </Link>
        )}
      </div>
    </header>
  );
}