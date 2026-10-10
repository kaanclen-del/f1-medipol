"use client";

import { useEffect, useState } from "react";

type SiteTheme = "gray" | "red" | "light";

const themes: {
  key: SiteTheme;
  label: string;
}[] = [
  {
    key: "gray",
    label: "GRİ",
  },
  {
    key: "red",
    label: "F1 KIRMIZI",
  },
  {
    key: "light",
    label: "AÇIK",
  },
];

function isValidTheme(value: string | null): value is SiteTheme {
  return value === "gray" || value === "red" || value === "light";
}

function applyTheme(theme: SiteTheme) {
  const html = document.documentElement;

  /*
   * Sitenin eski/yeni bütün tema kodlarıyla
   * uyumlu olması için ikisini de güncelliyoruz.
   */
  html.setAttribute("data-theme", theme);
  html.setAttribute("data-site-theme", theme);

  try {
    localStorage.setItem("theme", theme);
    localStorage.setItem("site-theme", theme);
    localStorage.setItem("siteTheme", theme);
    localStorage.setItem("f1-site-theme", theme);
  } catch {
    // localStorage kullanılamıyorsa tema yine çalışır.
  }

  /*
   * Header gibi diğer client component'lere
   * temanın değiştiğini bildir.
   */
  window.dispatchEvent(
    new CustomEvent("theme-changed", {
      detail: {
        theme,
      },
    })
  );

  window.dispatchEvent(
    new CustomEvent("site-theme-changed", {
      detail: {
        theme,
      },
    })
  );
}

export default function SiteThemeSwitcher() {
  const [theme, setTheme] = useState<SiteTheme>("gray");

  useEffect(() => {
    let initialTheme: SiteTheme = "gray";

    /*
     * Önce kayıtlı kullanıcı tercihini kontrol et.
     */
    try {
      const storedThemes = [
        localStorage.getItem("f1-site-theme"),
        localStorage.getItem("site-theme"),
        localStorage.getItem("siteTheme"),
        localStorage.getItem("theme"),
      ];

      const storedTheme = storedThemes.find((value) =>
        isValidTheme(value)
      );

      if (storedTheme && isValidTheme(storedTheme)) {
        initialTheme = storedTheme;
      } else {
        /*
         * LocalStorage yoksa HTML attribute'una bak.
         */
        const siteTheme =
          document.documentElement.getAttribute("data-site-theme");

        const dataTheme =
          document.documentElement.getAttribute("data-theme");

        if (isValidTheme(siteTheme)) {
          initialTheme = siteTheme;
        } else if (isValidTheme(dataTheme)) {
          initialTheme = dataTheme;
        }
      }
    } catch {
      const siteTheme =
        document.documentElement.getAttribute("data-site-theme");

      const dataTheme =
        document.documentElement.getAttribute("data-theme");

      if (isValidTheme(siteTheme)) {
        initialTheme = siteTheme;
      } else if (isValidTheme(dataTheme)) {
        initialTheme = dataTheme;
      }
    }

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function changeTheme(nextTheme: SiteTheme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="global-theme-switcher">
      <div className="global-theme-label">
        TEMA
      </div>

      <div className="global-theme-options">
        {themes.map((item) => (
          <button
            key={item.key}
            type="button"
            data-theme-option={item.key}
            aria-pressed={theme === item.key}
            className={
              theme === item.key
                ? `global-theme-button active ${item.key}`
                : `global-theme-button ${item.key}`
            }
            onClick={() => {
              changeTheme(item.key);
            }}
          >
            <span
              className={`global-theme-dot ${item.key}`}
              aria-hidden="true"
            />

            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}