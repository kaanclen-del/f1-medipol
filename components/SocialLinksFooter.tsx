"use client";

import { useEffect, useState } from "react";

type SocialLink = {
  id: number;
  label: string;
  url: string;
  icon: string;
  sort_order: number;
};

const iconText: Record<string, string> = {
  instagram: "◎",
  linkedin: "in",
  tiktok: "♪",
  whatsapp: "◉",
  link: "↗",
};

export default function SocialLinksFooter() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/social-links", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const result = await response.json();
        return Array.isArray(result.links) ? result.links : [];
      })
      .then((items: SocialLink[]) => {
        if (active) setLinks(items);
      })
      .catch(() => {
        if (active) setLinks([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <style>{`
        .f1-social-footer,
        .f1-social-footer * {
          box-sizing: border-box;
        }

        .f1-social-footer {
          width: 100%;
          margin-top: auto;
          padding: 30px 22px 18px;
          background:
            radial-gradient(ellipse at 12% 0%, rgba(225,6,0,.13), transparent 42%),
            #101115;
          color: #f5f6f8;
          border-top: 2px solid #e10600;
        }

        .f1-social-footer-inner {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .f1-social-footer-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 23px;
        }

        .f1-social-footer-heading {
          min-width: 0;
        }

        .f1-social-footer-title {
          margin: 0;
          color: #fff;
          font-size: clamp(20px, 3vw, 28px);
          font-weight: 900;
          letter-spacing: -.7px;
          line-height: 1.2;
        }

        .f1-social-footer-title span {
          color: #e10600;
        }

        .f1-social-footer-subtitle {
          margin: 8px 0 0;
          color: #a1a5ae;
          font-size: 12px;
          line-height: 1.6;
        }

        .f1-social-footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          width: 145px;
          min-height: 52px;
          text-decoration: none;
        }

        .f1-social-footer-logo img {
          display: block;
          width: 100%;
          max-width: 145px;
          max-height: 62px;
          object-fit: contain;
          object-position: right center;
        }

        .f1-social-footer-logo-fallback {
          color: #fff;
          font-size: 19px;
          font-weight: 950;
          letter-spacing: -.7px;
          white-space: nowrap;
        }

        .f1-social-footer-logo-fallback span {
          color: #e10600;
        }

        .f1-social-footer-divider {
          height: 1px;
          background: rgba(255,255,255,.12);
        }

        .f1-social-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-top: 17px;
        }

        .f1-social-footer-caption {
          flex: 0 0 auto;
          color: #858b96;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .f1-social-footer-links {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .f1-social-footer-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 9px;
          color: #f5f6f8;
          background: rgba(255,255,255,.035);
          font-size: 11px;
          font-weight: 750;
          text-decoration: none;
          transition: background .18s ease, border-color .18s ease, transform .18s ease;
        }

        .f1-social-footer-link:hover {
          background: rgba(225,6,0,.13);
          border-color: rgba(225,6,0,.65);
          transform: translateY(-1px);
        }

        .f1-social-footer-icon {
          display: inline-grid;
          place-items: center;
          min-width: 19px;
          height: 19px;
          color: #ff514b;
          font-size: 14px;
          font-weight: 900;
        }

        @media (max-width: 620px) {
          .f1-social-footer {
            padding: 24px 15px 18px;
          }

          .f1-social-footer-top {
            gap: 12px;
            padding-bottom: 19px;
          }

          .f1-social-footer-title {
            font-size: clamp(17px, 4.8vw, 23px);
          }

          .f1-social-footer-subtitle {
            max-width: 230px;
            font-size: 11px;
          }

          .f1-social-footer-logo {
            width: 92px;
            min-height: 42px;
          }

          .f1-social-footer-logo img {
            max-width: 92px;
            max-height: 45px;
          }

          .f1-social-footer-bottom {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .f1-social-footer-links {
            justify-content: flex-start;
          }
        }

        @media (max-width: 360px) {
          .f1-social-footer-top {
            align-items: flex-start;
          }

          .f1-social-footer-logo {
            width: 72px;
          }

          .f1-social-footer-logo img {
            max-width: 72px;
          }

          .f1-social-footer-link {
            padding: 7px 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .f1-social-footer-link {
            transition: none;
          }
        }
      `}</style>

      <footer className="f1-social-footer">
        <div className="f1-social-footer-inner">
          <div className="f1-social-footer-top">
            <div className="f1-social-footer-heading">
              <h2 className="f1-social-footer-title">
                F1 Social <span>Topluluğu</span>
              </h2>
              <p className="f1-social-footer-subtitle">
                Formula 1 tutkusunu paylaş, topluluğun bir parçası ol.
              </p>
            </div>

            <a
              className="f1-social-footer-logo"
              href="/"
              aria-label="F1 Social ana sayfa"
            >
              {!logoFailed ? (
                <img
                  src="/f1-social-logo.png"
                  alt="F1 Social"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <span className="f1-social-footer-logo-fallback">
                  F1 <span>SOCIAL</span>
                </span>
              )}
            </a>
          </div>

          <div className="f1-social-footer-divider" />

          <div className="f1-social-footer-bottom">
            <div className="f1-social-footer-caption">
              Bizi takip et
            </div>

            <nav
              className="f1-social-footer-links"
              aria-label="Sosyal medya bağlantıları"
            >
              {links.map((link) => (
                <a
                  key={link.id}
                  className="f1-social-footer-link"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="f1-social-footer-icon" aria-hidden="true">
                    {iconText[link.icon] || iconText.link}
                  </span>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}