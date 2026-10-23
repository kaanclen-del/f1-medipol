
"use client";

import MessagesClient from "./MessagesClient";

export default function DmDock({
  isLight = false,
}: {
  isLight?: boolean;
}) {
  return <MessagesClient isLight={isLight} />;
}
