import Image from "next/image";
import Link from "next/link";

export default function Header() {
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
      label: "Etkinlikler",
      href: "/events",
    },
    {
      label: "Galeri",
      href: "/gallery",
    },
    {
      label: "Yönetim Kurulu",
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
        background: "rgba(15,19,26,.92)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        className="site-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          height: "100%",
        }}
      >
        {/* LOGO - ANA SAYFAYA ZORUNLU DÖNÜŞ */}

        <a
          href="/"
          style={{
            width: "205px",
            height: "56px",
            overflow: "hidden",
            borderRadius: "10px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              objectFit: "contain",
            }}
          />
        </a>

        {/* NAVİGASYON */}

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            flex: 1,
            overflowX: "auto",
          }}
        >
          {/* ANA SAYFA */}

          <a
            href="/"
            style={{
              padding: "10px 11px",
              borderRadius: "9px",
              color: "#c7ced7",
              fontSize: "12px",
              fontWeight: 800,
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            Ana Sayfa
          </a>

          {/* DİĞER SAYFALAR */}

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 11px",
                borderRadius: "9px",
                color: "#c7ced7",
                fontSize: "12px",
                fontWeight: 800,
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* GİRİŞ */}

        <Link
          href="/login"
          className="btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            minWidth: "92px",
          }}
        >
          Giriş Yap
        </Link>
      </div>
    </header>
  );
}