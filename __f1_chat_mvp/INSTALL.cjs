// F1 Medipol Grand Prix Chat installer
// Run from your project's root folder: node .\__f1_chat_mvp\INSTALL.cjs
const fs = require('fs');
const path = require('path');

const project = process.cwd();
const bundle = __dirname;
const app = fs.existsSync(path.join(project,'src','app','layout.tsx')) ? 'src/app' : 'app';
const components = app.startsWith('src/') ? 'src/components' : 'components';
if (!fs.existsSync(path.join(project,'package.json')) || !fs.existsSync(path.join(project,app))) {
  console.error('HATA: VS Code terminalini f1-medipol proje klasorunde acmalisin.');
  process.exitCode = 1;
} else {
  const backup = path.join(project, 'f1_chat_backups', new Date().toISOString().replace(/[:.]/g,'-'));
  const copy = [
    ['app/api/race-chat/route.ts', `${app}/api/race-chat/route.ts`],
    ['app/api/race-chat/[id]/route.ts', `${app}/api/race-chat/[id]/route.ts`],
    ['app/api/race-chat/report/route.ts', `${app}/api/race-chat/report/route.ts`],
    ['app/race-chat/page.tsx', `${app}/race-chat/page.tsx`],
    ['components/RaceChat.tsx', `${components}/RaceChat.tsx`],
    ['components/RaceChat.module.css', `${components}/RaceChat.module.css`],
  ];
  for (const [from, to] of copy) {
    const target = path.join(project, to);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    if (fs.existsSync(target)) {
      const saved = path.join(backup,to);
      fs.mkdirSync(path.dirname(saved),{recursive:true});
      fs.copyFileSync(target,saved);
      console.log('YEDEK:',to);
    }
    fs.copyFileSync(path.join(bundle, from), target);
    console.log('YUKLENDI:',to);
  }
  const predict = path.join(project, app, 'predict', 'page.tsx');
  if (fs.existsSync(predict)) {
    let src = fs.readFileSync(predict,'utf8');
    const marker = 'F1_MEDIPOL_RACE_CHAT_LINK_V1';
    if (!src.includes(marker)) {
      if (!/import\s+Link\s+from\s+["']next\/link["']/.test(src)) {
        src = 'import Link from "next/link";\n' + src;
      }
      const injection = `\n        {/* ${marker} */}\n        <div className="site-container" style={{ paddingTop: "16px", paddingBottom: "5px" }}>\n          <Link href="/race-chat" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px 18px", borderRadius: "13px", background: "linear-gradient(100deg,rgba(218,25,44,.19),rgba(218,25,44,.045))", border: "1px solid rgba(229,55,70,.34)", color: "inherit", textDecoration: "none", fontSize: "13px", fontWeight: 850 }}>\n            <span>💬 GRAND PRIX CANLI SOHBET <small style={{ display:"block", marginTop: "4px", opacity: .7, fontWeight: 500 }}>Yarış hakkında diğer üyelerle konuş</small></span>\n            <span aria-hidden="true" style={{ fontSize: "25px", color: "#ef4654" }}>↗</span>\n          </Link>\n        </div>\n`;
      const m = src.match(/<main(?:\s[^>]*)?>/);
      if (m) {
        const saved = path.join(backup,app,'predict','page.tsx');
        fs.mkdirSync(path.dirname(saved),{recursive:true});
        fs.copyFileSync(predict,saved);
        src = src.replace(m[0],m[0]+injection);
        fs.writeFileSync(predict,src);
        console.log('GUNCELLENDI:', `${app}/predict/page.tsx`, '— sohbet baglantisi eklendi');
      } else {
        console.log('UYARI: predict sayfasinin yapisi farkli, otomatik baglanti eklenemedi. /race-chat acilabilir.');
      }
    } else console.log('ATLANDI: predict sayfasinda sohbet baglantisi zaten var.');
  } else console.log('UYARI: predict/page.tsx bulunamadi; bagimsiz /race-chat sayfasi calisir.');
  console.log('\n================================================');
  console.log('KURULUM TAMAMLANDI. SIRADAKI ADIM: SUPABASE SQL.');
  console.log('SQL DOSYASI:',path.join(bundle,'sql','RACE_CHAT_SETUP.sql'));
  console.log('Sohbet adresi: /race-chat');
  console.log('Eski dosyalarin yedegi:',backup);
  console.log('================================================\n');
}
