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

const appIcon = "/f1-social-app-icon.png.png";

export const metadata: Metadata = {
  title: "F1 SOCIAL",
  description: "F1 SOCIAL yarış tahminleri, etkinlikler ve Arcade.",
  applicationName: "F1 SOCIAL",
  icons: {
    icon: [{ url: appIcon, type: "image/png" }],
    shortcut: [{ url: appIcon, type: "image/png" }],
    apple: [{ url: appIcon, type: "image/png" }],
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
        <SiteThemeSwitcher />
        <RouteTransition />
        {children}
        <LegendaryTeamRadio />
      </body>
    </html>
  );
}