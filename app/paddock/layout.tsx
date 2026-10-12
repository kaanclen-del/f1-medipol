import Header from "@/components/Header";
import PaddockPostFocus from "@/components/PaddockPostFocus";

export default function PaddockLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <>
      <Header />

      <PaddockPostFocus />

      {children}
    </>
  );
}