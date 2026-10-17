// F1 MEDIPOL - Profil yerlesimi + wallpaper kalitesi guvenli guncelleme
// Proje kokunde: node .\__profile_layout_v2\INSTALL.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const jobs = [];
function stop(message) { console.error('\nKURULUM DURDURULDU: ' + message); process.exit(1); }
function load(file) { const abs = path.join(root, file); if (!fs.existsSync(abs)) stop(file+' bulunamadi. Komutu proje ana klasorunde calistir.'); return fs.readFileSync(abs,'utf8'); }
function exactly(source, from, to, label) {
  const matches = [...source.matchAll(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags+'g'))];
  if(matches.length!==1) stop(label + ': beklenen bolum bulunamadi veya birden fazla bulundu ('+matches.length+'). Hicbir dosya degistirilmedi.');
  return source.replace(from,to);
}
function queue(file,before,after){ if(before!==after)jobs.push({file, before, after}); }
if (!fs.existsSync(path.join(root,'package.json'))) stop('package.json bulunamadi; VS Code terminalinde f1-medipol klasorunu ac.');

let profile=load('app/profile/page.tsx');
if (profile.includes('profile-summary-favorites') && !profile.includes('showcase-panel')) stop('Bu duzenleme zaten kurulu. Tekrar kurulum gerekli degil.');
if (!profile.includes('<ProfileWallpaperBackdrop wallpaper={wallpaper} />')) stop('Arka plan sistemi farkli. Mevcut profile kodunun incelenmesi gerekiyor.');
const originalProfile=profile;

const favorites = `            <aside className="profile-summary profile-summary-favorites">
              <div className="summary-title">FAVORİLER</div>
              <div className="summary-favorite" style={{ ["--pick-accent" as string]: teamBrand?.color || profileAccent.primary }}>
                <div className="summary-favorite-visual summary-favorite-logo">
                  {teamBrand ? <img src={teamBrand.logoUrl} alt={teamBrand.name} /> : <span>F1</span>}
                </div>
                <div className="summary-favorite-content">
                  <span>FAVORİ TAKIM</span>
                  <strong>{teamBrand?.name || "Seçilmedi"}</strong>
                </div>
              </div>
              <div className="summary-favorite" style={{ ["--pick-accent" as string]: favoriteDriverTeamColor || profileAccent.primary }}>
                <div className="summary-favorite-visual summary-favorite-driver">
                  {favoriteDriverImage ? <img src={favoriteDriverImage} alt={profile?.favorite_driver || "Favori pilot"} /> : <span>{driverInitials(profile?.favorite_driver)}</span>}
                </div>
                <div className="summary-favorite-content">
                  <span>FAVORİ PİLOT</span>
                  <strong>{profile?.favorite_driver || "Seçilmedi"}</strong>
                  {favoriteDriverData?.team_name && <small>{favoriteDriverData.team_name}</small>}
                </div>
              </div>
            </aside>`;
profile=exactly(profile, /            <aside className="profile-summary">[\s\S]*?<\/aside>/,favorites,'Driver Summary / Favoriler alani');
profile=exactly(profile, /            <section className="profile-stats-layout">[\s\S]*?<\/section>\s*<section className="glass-panel showcase-panel">[\s\S]*?<\/section>\s*/, '', 'Tekrar eden istatistik ve Surucu Vitrini');
profile=exactly(profile, /          <aside className="profile-sidebar">\s*<section className="glass-panel">\s*<PanelHeader kicker="GRID PICKS" title="Favoriler" \/>[\s\S]*?<\/section>\s*(?=<ProfileAchievements\b)/, '          <aside className="profile-sidebar">\n            ', 'Sag sidebar Favoriler bolumu');
// Iki kaldirilan bilesenin artik kullanilmayan fonksiyonlarini temizle.
profile=exactly(profile, /function StatCard\([\s\S]*?\n}\n(?=function PanelHeader)/, '', 'Eski StatCard fonksiyonu');
profile=exactly(profile, /function ShowcaseItem\([\s\S]*?\n}\n(?=function InfoRow)/, '', 'Eski ShowcaseItem fonksiyonu');
const extraStyle = `
/* PROFILE LAYOUT V2: Favoriler yalnizca profil ozetinde */
.profile-summary-favorites { padding:17px; display:grid; gap:9px; align-content:center; }
.profile-summary-favorites .summary-title { margin:0 0 5px; font-size:9px; letter-spacing:.12em; }
.summary-favorite { min-width:0; min-height:83px; display:flex; align-items:center; gap:13px; padding:10px 11px; border:1px solid rgba(255,255,255,.095); border-radius:10px; background:linear-gradient(112deg,rgba(255,255,255,.045),rgba(255,255,255,.012)); position:relative; overflow:hidden; }
.summary-favorite::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--pick-accent); opacity:.88; }
.summary-favorite-visual { width:59px; height:59px; flex:0 0 59px; border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:rgba(255,255,255,.075); }
.summary-favorite-logo { background:#fff; }
.summary-favorite-logo img { display:block; width:49px; height:49px; object-fit:contain; }
.summary-favorite-logo span { color:#171b24; font-size:22px; font-style:italic; font-weight:950; }
.summary-favorite-driver { align-items:flex-end; background:rgba(255,255,255,.045); }
.summary-favorite-driver img { display:block; max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; object-position:center bottom; }
.summary-favorite-driver span { color:var(--pick-accent); font-size:17px; font-weight:900; }
.summary-favorite-content { min-width:0; display:flex; flex-direction:column; gap:5px; }
.summary-favorite-content > span { color:#9ba8b5; font-size:9px; font-weight:800; letter-spacing:.07em; }
.summary-favorite-content > strong { overflow-wrap:anywhere; font-size:15px; line-height:1.25; font-weight:900; }
.summary-favorite-content > small { color:var(--pick-accent); font-size:9px; font-weight:800; }
/* Tekrar eden kartlar kaldigi icin Paddock yukaridan baslar. */
.profile-content-grid { align-items:start; }
/* Guncel secili arka plan kucuk onizlemede de kesilmesin. */
.wallpaper-thumb { background-color:#080d15; background-size:contain; background-position:center top; background-repeat:no-repeat; }
@media (max-width:1150px) { .profile-summary-favorites { grid-column:1 / -1; grid-template-columns:repeat(2,minmax(0,1fr)); } .profile-summary-favorites .summary-title { grid-column:1 / -1; } }
@media (max-width:650px) { .profile-summary-favorites { grid-template-columns:1fr; text-align:left; } .profile-summary-favorites .summary-title { grid-column:auto; } .summary-favorite { min-height:75px; } }
`;
profile=exactly(profile, /\n`;\s*$/, '\n'+extraStyle+'\n`;\n', 'Profil CSS blogu');
queue('app/profile/page.tsx',originalProfile,profile);

let backdrop=load('components/ProfileWallpaperBackdrop.tsx');
const originalBackdrop=backdrop;
backdrop=exactly(backdrop, /      <div\s*\n        className=\{styles\.texture\}\s*\n        style=\{\{ backgroundImage: getWallpaperBackground\(wallpaper\) \}\}\s*\n      \/>/, `      <div
        className={styles.texture}
        style={{ backgroundImage: wallpaper.image ? wallpaper.fallback : getWallpaperBackground(wallpaper) }}
      />
      {wallpaper.image ? (
        <div className={styles.imageLayer}>
          <img src={wallpaper.image} alt="" decoding="async" />
        </div>
      ) : null}
      {wallpaper.image ? <div className={styles.imageShade} /> : null}`, 'Arka plan goruntu katmani');
queue('components/ProfileWallpaperBackdrop.tsx',originalBackdrop,backdrop);

let backdropCss=load('components/ProfileWallpaperBackdrop.module.css');
const originalBackdropCss=backdropCss;
const backdropEnhancement = `
/* PROFILE WALLPAPER V2: zorunlu zoom/kirpma yok, mevcut cozunurluk korunur. */
.texture {
  inset:0;
  background-size:100% 100%;
  background-position:center top;
  background-repeat:no-repeat;
  transform:none !important;
  animation:none !important;
}
.root[data-motion="speed"] .texture { animation:none !important; }
.imageLayer { position:absolute; left:0; right:0; top:0; display:flex; justify-content:center; align-items:flex-start; pointer-events:none; overflow:hidden; }
.imageLayer img { display:block; width:auto; height:auto; max-width:100%; max-height:none; object-fit:contain; object-position:center top; transform:none !important; filter:none; image-rendering:auto; -webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 69%,transparent 100%); mask-image:linear-gradient(to bottom,#000 0%,#000 69%,transparent 100%); }
.imageShade { position:absolute; inset:0; background:linear-gradient(to bottom,rgba(3,6,10,.10),rgba(3,6,10,.16) 37%,rgba(3,6,10,.30)); pointer-events:none; }
@media (prefers-reduced-motion: reduce) { .imageLayer img { transform:none !important; } }
`;
if(backdropCss.includes('PROFILE WALLPAPER V2:'))stop('Arka plan CSS iyilestirmesi zaten yuklu. Tekrar kurma.');
backdropCss+='\n'+backdropEnhancement;
queue('components/ProfileWallpaperBackdrop.module.css',originalBackdropCss,backdropCss);

// TUM kontroller bittikten sonra yedek olustur ve dosyalari guvenli sekilde guncelle.
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const backupDir=path.join(root,'f1_profile_layout_yedek',stamp);
for(const job of jobs){ const dest=path.join(backupDir,job.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,job.before,'utf8'); }
for(const job of jobs){ const dest=path.join(root,job.file);fs.writeFileSync(dest,job.after,'utf8');console.log('GUNCELLENDI: '+job.file); }
console.log('\nKURULUM BASARILI: Profil kartlari sadelestirildi, Favoriler yukariya tasindi, wallpaper zoom kaldirildi.');
console.log('Yedek klasoru: '+backupDir);
console.log('Veritabani islemi gerekmiyor. /profile sayfasini Ctrl+F5 ile yenile.');
