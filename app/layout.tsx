import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import LegendaryTeamRadio from "@/components/LegendaryTeamRadio";
import RouteTransition from "@/components/RouteTransition";
import SiteThemeSwitcher from "@/components/SiteThemeSwitcher";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://formulasocial.org"),
  title: "F1 Social",
  description:
    "Formula 1 yarış tahminleri, yarış gündemi, etkinlikler ve F1 hayranlarına özel Arcade deneyimi.",
  applicationName: "F1 Social",

  openGraph: {
    type: "website",
    url: "https://formulasocial.org/",
    siteName: "F1 Social",
    title: "F1 Social | Formula 1 Topluluğu",
    description:
      "Formula 1 yarış tahminleri, yarış gündemi, etkinlikler ve F1 hayranlarına özel Arcade deneyimi.",
    locale: "tr_TR",
  },

  twitter: {
    card: "summary",
    title: "F1 Social | Formula 1 Topluluğu",
    description:
      "Formula 1 yarış tahminleri, yarış gündemi, etkinlikler ve F1 hayranlarına özel Arcade deneyimi.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e10600",
};

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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "F1 Social",
              alternateName: "F1 SOCIAL",
              url: "https://formulasocial.org/",
              inLanguage: "tr-TR",
            }),
          }}
        />

        <SiteThemeSwitcher />
        <RouteTransition />
        {children}
        <LegendaryTeamRadio />
      </body>
    </html>
  );
}