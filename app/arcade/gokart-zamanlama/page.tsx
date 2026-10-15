import Header from "@/components/Header";
import Link from "next/link";
import TimingClient from "./TimingClient";
import s from "./timing.module.css";

export const metadata = {
  title: "Go-Kart Zaman Merkezi | F1 Medipol",
  description: "Go-kart tur zamanlama, sürücü kaydı, süre cezaları ve sıralama merkezi",
};
export default function GoKartTimingPage(){
  return <>
    <Header />
    <main className={s.page}>
      <div className={s.shell}>
        <div className={s.breadcrumb}><Link href="/arcade">← ARCADE'E DÖN</Link><span> / GO-KART ZAMAN MERKEZİ</span></div>
        <TimingClient />
      </div>
    </main>
  </>;
}
