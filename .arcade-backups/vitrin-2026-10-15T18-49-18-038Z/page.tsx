import Link from "next/link";
import Header from "@/components/Header";

export default function ArcadePage() {
  return <>
    <Header />
    <main className="arcade-landing">
      <div className="arcade-wrap">
        <header className="arcade-intro">
          <span>F1 MEDİPOL · OYUN MERKEZİ</span>
          <h1>F1 Arcade</h1>
          <p>Üç farklı deneyim: takımının pit duvarına geç veya yarış tarihini yeniden yaz.</p>
        </header>
        <section className="arcade-games" aria-label="Oyun seçimi">
          <Link href="/arcade/manager" className="arcade-game manager">
            <div className="game-top"><span>01 / MANAGER CAREER</span><span>🏁</span></div>
            <h2>F1 Manager</h2>
            <p>Takımını kur, lobiye katıl, pilotlarla anlaş, Ar-Ge ve yarış stratejilerini yönet.</p>
            <div className="game-pills"><span>LOBİ</span><span>TAKIM YÖNETİMİ</span><span>SEZON</span></div>
            <div className="game-enter">MANAGER'I AÇ <b aria-hidden="true">↗</b></div>
          </Link>
          <Link href="/arcade/what-if" className="arcade-game whatif">
            <div className="game-top"><span>02 / ALTERNATİF EVREN</span><span>⚡</span></div>
            <h2>What If?</h2>
            <p>Ya bu Grand Prix'yi başka bir pilot kazansaydı? Sıralamayı değiştir ve şampiyonayı simüle et.</p>
            <div className="game-pills"><span>FİNİŞ SIRASI</span><span>PİLOT PUANLARI</span><span>TAKIMLAR</span></div>
            <div className="game-enter">WHAT IF OYNA <b aria-hidden="true">↗</b></div>
          </Link>
                  <Link href="/arcade/kart-rush" className="arcade-game kartrush">
            <div className="game-top"><span>03 / 3D MULTIPLAYER</span><span>🏎️</span></div>
            <h2>Kart Rush 3D</h2>
            <p>Arkadaşlarınla lobi kur, 3D pistte kapış! Turbo, kalkan ve EMP güçlerini toplayarak yarışı kazan.</p>
            <div className="game-pills"><span>3D YARIŞ</span><span>LOBİ</span><span>ÖZEL GÜÇLER</span></div>
            <div className="game-enter">KART RUSH OYNA <b aria-hidden="true">↗</b></div>
          </Link>
</section>
      </div>
      <style>{`
        .arcade-landing { min-height:calc(100vh - 65px); background:
          radial-gradient(ellipse at 88% 18%,rgba(218,0,12,.17),transparent 48%),
          linear-gradient(140deg,#100c12,#18090e 55%,#0d1018); color:#f5f7f9; padding:65px 20px 100px; }
        :root[data-site-theme="light"] .arcade-landing { background:
          radial-gradient(ellipse at 85% 20%,rgba(255,64,57,.20),transparent 55%),linear-gradient(140deg,#2b060c,#4c0810 55%,#170f17); color:#fff; }
        .arcade-wrap { width:min(1280px,100%); margin:auto; }
        .arcade-intro span { color:#ff655d; font-weight:950; letter-spacing:.16em; font-size:11px; }
        .arcade-intro h1 { font-size:clamp(45px,6vw,75px); line-height:1.05; margin:11px 0 13px; color:#fff; letter-spacing:-.045em; }
        .arcade-intro p { max-width:65ch; color:#b7bec9; line-height:1.6; font-size:15px; }
        .arcade-games { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; margin-top:35px; }
        .arcade-game { min-height:470px; padding:36px; display:flex; flex-direction:column; border-radius:20px;
          border:1px solid rgba(255,255,255,.14); color:#fff!important; text-decoration:none;
          transition:transform .2s,border-color .2s; overflow:hidden; }
        .arcade-game:hover { transform:translateY(-3px); border-color:#ff655d; }
        .arcade-game.manager { background:radial-gradient(circle at 100% 0,rgba(234,38,36,.34),transparent 50%),linear-gradient(140deg,#341116,#151820); }
        .arcade-game.whatif { background:radial-gradient(circle at 100% 5%,rgba(240,170,48,.20),transparent 50%),linear-gradient(140deg,#261626,#151820); }
        .game-top { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:11px;
          font-weight:950; letter-spacing:.12em; color:#ff7b75; }
        .whatif .game-top { color:#ffd27d; }
        .game-top span:last-child { font-size:26px; }
        .arcade-game h2 { margin:62px 0 12px; font-size:clamp(38px,4.3vw,59px); line-height:1; letter-spacing:-.045em; color:#fff; }
        .arcade-game p { max-width:48ch; font-size:15px; line-height:1.7; color:#bcc2cc; }
        .game-pills { display:flex; gap:7px; flex-wrap:wrap; margin-top:17px; }
        .game-pills span { border:1px solid rgba(255,255,255,.17); border-radius:999px; padding:7px 10px;
          font-size:9px; letter-spacing:.06em; font-weight:900; color:#d3d8df; }
        .game-enter { margin-top:auto; padding-top:37px; display:flex; justify-content:space-between; align-items:center;
          font-weight:950; font-size:12px; letter-spacing:.07em; }
        .game-enter b { border:1px solid rgba(255,255,255,.18); border-radius:50%; width:43px;height:43px;display:grid;place-items:center;font-size:21px; }
        .arcade-game.kartrush { background:radial-gradient(circle at 95% 8%,rgba(58,177,240,.32),transparent 50%),linear-gradient(140deg,#361326,#111f32); }
        .kartrush .game-top { color:#82d8fc; }
        @media(max-width:1180px) and (min-width:771px){.arcade-games{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:770px){.arcade-landing{padding:35px 14px 65px}.arcade-games{grid-template-columns:1fr;gap:12px}.arcade-game{min-height:365px;padding:27px}.arcade-game h2{margin-top:47px}}
      `}</style>
    </main>
  </>;
}
