/* F1 Medipol: mobile home + DM visual polish, safe additive installer. */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const bundle = __dirname;
const home = path.join(root, 'app', 'globals.css');
const dmCss = path.join(root, 'components', 'DmDock.module.css');
const dmTsx = path.join(root, 'components', 'DmDock.tsx');
const paths = [home, dmCss, dmTsx];
const absent = paths.filter(p => !fs.existsSync(p));
if (absent.length) {
  console.error('\n[HATA] Proje kok klasorunde calistir veya DM V2 kurulumu eksik:\n' + absent.map(p => ' - ' + path.relative(root, p)).join('\n'));
  process.exit(1);
}

const old = new Map(paths.map(p => [p, fs.readFileSync(p, 'utf8')]));
const content = new Map(old);
const micOld = '>{recording?"■":"🎤"}</button>';
const micNew = '>{recording ? <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" /></svg> : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3" /><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M8.5 21h7" /></svg>}</button>';
let tsx = content.get(dmTsx);
if (tsx.includes(micOld)) tsx = tsx.replace(micOld, micNew);
else if (!tsx.includes('M12 17v4M8.5 21h7')) {
  console.error('[HATA] DM mikrofon tasarimi beklenen kodla eslesmiyor. Dosyaya dokunulmadi.');
  process.exit(1);
}

// One-tap "new conversation" shortcut, using the existing find screen.
const headerNeedle = '            <button className={styles.iconBtn} onClick={closePanel} aria-label="Mesajlaşmayı kapat"><Icon name="close"/></button>';
const headerReplacement = '            {!active && view === "chats" && <button className={styles.iconBtn} onClick={() => {setView("find");setSearch("");}} aria-label="Yeni sohbet başlat" title="Yeni sohbet"><Icon name="plus"/></button>}\n' + headerNeedle;
if (tsx.includes(headerNeedle) && !tsx.includes('aria-label="Yeni sohbet başlat"')) tsx = tsx.replace(headerNeedle, headerReplacement);

const listNeedle = '              <div className={styles.listBody}>\n                {view === "chats" && <>';
const listReplacement = '              <div className={styles.listBody}>\n                {view === "chats" && <div className={styles.listSectionHeader}><strong>Son konuşmalar</strong><span>{friends.length} sohbet</span></div>}\n                {view === "chats" && <>';
if (tsx.includes(listNeedle) && !tsx.includes('styles.listSectionHeader')) tsx = tsx.replace(listNeedle, listReplacement);

const viewportNeedle = '  useEffect(() => {\n    if (!open) return;\n    const before = document.body.style.overflow;';
const viewportEffect = `  // iOS klavye acildiginda DM pencere yuksekligini gorunur ekrana uyarlayalim.
  useEffect(() => {
    if (!open || window.innerWidth > 680) return;
    const style = document.documentElement.style;
    const visual = window.visualViewport;
    const resize = () => {
      style.setProperty("--f1-dm-height", Math.round(visual?.height || window.innerHeight) + "px");
      style.setProperty("--f1-dm-top", Math.round(visual?.offsetTop || 0) + "px");
    };
    resize();
    visual?.addEventListener("resize", resize);
    visual?.addEventListener("scroll", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      visual?.removeEventListener("resize", resize);
      visual?.removeEventListener("scroll", resize);
      window.removeEventListener("orientationchange", resize);
      style.removeProperty("--f1-dm-height");
      style.removeProperty("--f1-dm-top");
    };
  }, [open]);

`;
if (tsx.includes(viewportNeedle) && !tsx.includes('iOS klavye acildiginda')) tsx = tsx.replace(viewportNeedle, viewportEffect + viewportNeedle);
content.set(dmTsx, tsx);

function appendBlock(css, startMarker, endMarker, fileName) {
  const incoming = fs.readFileSync(path.join(bundle, fileName), 'utf8').trim();
  const block = '\n\n' + startMarker + '\n' + incoming + '\n' + endMarker + '\n';
  const start = css.indexOf(startMarker);
  if (start !== -1) {
    const end = css.indexOf(endMarker, start);
    if (end === -1) throw new Error('CSS marker missing: ' + endMarker);
    return css.slice(0, start) + block.trimStart().trimEnd() + css.slice(end + endMarker.length);
  }
  return css.trimEnd() + block;
}
content.set(home, appendBlock(content.get(home), '/* F1 MOBILE HOME V3 START */', '/* F1 MOBILE HOME V3 END */', 'home-mobile-v3.css'));
const extraSection = '.listSectionHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 4px 10px;color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.03em}.listSectionHeader strong{color:var(--text);font-size:13px;font-weight:850}.listSectionHeader span{font-size:11px;font-weight:600}@media(max-width:680px){.listSectionHeader{padding:16px 4px 7px}.listSectionHeader strong{font-size:14px}}\n';
const src = fs.readFileSync(path.join(bundle, 'dm-mobile-v3.css'),'utf8');
content.set(dmCss, appendBlock(content.get(dmCss), '/* F1 DM MOBILE V3 START */', '/* F1 DM MOBILE V3 END */', 'dm-mobile-v3.css').replace('/* F1 DM MOBILE V3 END */', extraSection + '/* F1 DM MOBILE V3 END */'));

const changed = paths.filter(p => content.get(p) !== old.get(p));
if (!changed.length) { console.log('[OK] Surum V3 zaten kurulu.'); process.exit(0); }
const tag = new Date().toISOString().replace(/[:.]/g,'-');
const backupDir = path.join(root,'f1_mobile_v3_yedek',tag);
for (const p of changed) {
  const dest = path.join(backupDir, path.relative(root,p));
  fs.mkdirSync(path.dirname(dest), {recursive:true});
  fs.copyFileSync(p,dest);
}
try {
  for (const p of changed) fs.writeFileSync(p,content.get(p),'utf8');
} catch (err) {
  console.error('[HATA] Dosya yazimi tamamlanamadi:',err.message);
  for (const p of changed) {
    const restore = path.join(backupDir, path.relative(root,p));
    if (fs.existsSync(restore)) fs.copyFileSync(restore,p);
  }
  process.exit(1);
}
console.log('\n[F1 MEDIPOL] MOBIL ARAYUZ V3 KURULDU');
console.log('Degisen dosyalar:', changed.map(p => path.relative(root,p)).join(', '));
console.log('Yedek:',backupDir);
console.log('SQL gerekmez. npm.cmd run build -- --webpack ile kontrol et.');
