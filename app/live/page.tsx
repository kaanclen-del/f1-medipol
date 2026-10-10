import Header from "@/components/Header";
import F1LiveReplayCenter from "@/components/F1LiveReplayCenter";

export const dynamic =
  "force-dynamic";

export default function LivePage() {
  return (
    <>
      <Header />

      <main>
        <F1LiveReplayCenter />
      </main>
    </>
  );
}