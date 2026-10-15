"use client";

import { useEffect, useState } from "react";
import MessagesClient from "@/components/MessagesClient";

function isSmallDevice() {
  return window.innerWidth <= 1199 ||
    (window.matchMedia("(pointer: coarse)").matches && window.innerWidth <= 1500);
}

export default function MessagesRouteClient() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // A diagnostic/fallback route: bypass desktop popup redirect if a chunk fails.
    // Phone/tablet remain full page as before.
    if (isSmallDevice() || params.get("full") === "1") {
      setReady(true);
      return;
    }

    let stored = "/";
    try { stored = window.sessionStorage.getItem("f1-dm-last-page") || "/"; } catch {}
    const safe = stored.startsWith("/") && !stored.startsWith("//") && !stored.startsWith("/messages") ? stored : "/";
    // Direct /messages visits and stale home-only history must not produce
    // an empty page with an orphan desktop popup. Use the full chat instead.
    if (safe === "/") { setReady(true); return; }
    const destination = new URL(safe, window.location.origin);
    destination.searchParams.set("f1dm", "open");
    const other = params.get("dm");
    if (other) destination.searchParams.set("dm", other);
    if (params.get("view") === "groups") destination.searchParams.set("dmview", "groups");
    window.location.replace(destination.pathname + destination.search + destination.hash);
  }, []);

  return ready ? <MessagesClient mode="page" /> : null;
}
