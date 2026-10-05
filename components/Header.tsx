import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const links = [
    ["Ana Sayfa", "/"],
    ["Canlı", "/live"],
    ["Tahmin", "/predict"],
    ["Etkinlikler", "/events"],
    ["Galeri", "/gallery"],
    ["Yönetim Kurulu", "/team"],
    ["Paddock", "/paddock"],
    ["Arcade", "/arcade"],
  ];

  return (
    <header
      style={{
        height: "78px",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        background: "rgba(17,21,29,.94)",
        backdropFilter: "blur(18px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="site-container"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <Link
          href="/"
          style={{
            width: "205px",
            height: "56px",
            overflow: "hidden",
            borderRadius: "10px",
            background: "white",
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
            style={{
              width: "245px",
              maxWidth: "none",
              height: "auto",
            }}
          />
        </Link>

        <nav
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            fontSize: "13px",
            fontWeight: 800,
            color: "#b8c1cc",
          }}
        >
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className="btn btn-red"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
          }}
        >
          Oturum Aç
        </Link>
      </div>
    </header>
  );
}