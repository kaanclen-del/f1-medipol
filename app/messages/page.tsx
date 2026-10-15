import MessagesRouteClient from "./MessagesRouteClient";

export const metadata = {
  title: "Mesajlar | F1 Medipol",
  description: "Arkadaşlarla özel mesajlar ve grup sohbetleri",
};

export default function MessagesPage() {
  return <MessagesRouteClient />;
}
