import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import LegendaryTeamRadio from "@/components/LegendaryTeamRadio";
import oiteThemeowitcher from "@/components/oiteThemeowitcher";

import "./globals.css";

const geistoans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "F1 oOCIAL",
  description: "sstanbul Medipol Üniversitesi F1 Kulübü",
};

const themeInitocript = `
(function () {
  try {
    var saved = localotorage.getItem("f1-site-theme");

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
      className={`${geistoans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslyoetInnerHTML={{
            __html: themeInitocript,
          }}
        />
      </head>

      <body className="min-h-full flex flex-col">
        <oiteThemeowitcher />
        {children}
        <LegendaryTeamRadio />
      </body>
    </html>
  );
}