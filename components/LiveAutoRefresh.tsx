"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LiveAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 15000);

    return () => clearInterval(timer);
  }, [router]);

  return null;
}