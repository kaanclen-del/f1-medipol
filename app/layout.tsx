import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import SiteThemeSwitcher from "@/components/SiteThemeSwitcher";

import "./globals.css";

const geistSans = Geist({
  variable:
    "--font-geist-sans",

  subsets: [
    "latin",
  ],
});

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",

    subsets: [
      "latin",
    ],
  });

export const metadata: Metadata = {
  title:
    "F1 Medipol",

  description:
    "İstanbul Medipol Üniversitesi F1 Kulübü",
};

const themeInitScript = `
(function () {
  try {
    var saved =
      localStorage.getItem(
        "f1-site-theme"
      );

    var theme =
      saved === "red" ||
      saved === "light" ||
      saved === "gray"
        ? saved
        : "gray";

    document.documentElement.setAttribute(
      "data-site-theme",
      theme
    );
  } catch (e) {
    document.documentElement.setAttribute(
      "data-site-theme",
      "gray"
    );
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              themeInitScript,
          }}
        />
      </head>

      <body className="min-h-full flex flex-col">
        <SiteThemeSwitcher />

        {children}
      </body>
    </html>
  );
}