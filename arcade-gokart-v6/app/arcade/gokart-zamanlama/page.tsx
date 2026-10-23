import Header from "@/components/Header";
import Link from "next/link";
import TimingClient from "./TimingClient";
import s from "./timing.module.css";

export const metadata = {
  title: "Go-Kart Zaman Merkezi | F1 SOCIAL",
  description: "Go-kart tur zamanlama, sÃ¼rÃ¼cÃ¼ kaydÄ±, sÃ¼re cezalarÄ± ve sÄ±ralama merkezi",
};
export default function GoKartTimingPage(){
  return <>
    <Header />
    <main className={s.page}>
      <div className={s.shell}>
        <div className={s.breadcrumb}><Link href="/arcade">â† ARCADE'E DÃ–N</Link><span> / GO-KART ZAMAN MERKEZÄ°</span></div>
        <TimingClient />
      </div>
    </main>
  </>;
}

