// F1 Medipol - Profil arka planinda dengeli goruntu boyutu (V3)
// Yalnizca components/ProfileWallpaperBackdrop.module.css dosyasini gunceller.
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const file = path.join(root, 'components', 'ProfileWallpaperBackdrop.module.css');
const packageFile = path.join(root, 'package.json');
if (!fs.existsSync(packageFile)) {
  console.error('HATA: f1-medipol proje klasorunde degilsin (package.json bulunamadi).');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error('HATA: Profil arka plan CSS dosyasi bulunamadi: components/ProfileWallpaperBackdrop.module.css');
  process.exit(1);
}
const css = fs.readFileSync(file, 'utf8');
const marker = 'PROFILE WALLPAPER V3 - BALANCED IMAGE FIT';
if (css.includes(marker)) {
  console.log('BILGI: Dengeli arka plan boyutu zaten yuklu. Ek bir islem yapilmadi.');
  process.exit(0);
}
if (!css.includes('PROFILE WALLPAPER V2:') || !/\.imageLayer\s+img\s*\{/.test(css)) {
  console.error('HATA: Beklenen onceki arka plan surumu bulunamadi. Guvenlik icin CSS degistirilmedi.');
  process.exit(1);
}
const patch = `
/* PROFILE WALLPAPER V3 - BALANCED IMAGE FIT
   Gorsel, profil alanini yatayda doldurur; kenarlarda yalnizca %2'ser pay
   kesilir. Olcek animasyonu resimde yoktur, isik animasyonlari surer. */
.imageLayer {
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
}
.imageLayer img {
  flex: 0 0 104%;
  width: 104%;
  min-width: 104%;
  max-width: none;
  height: auto;
  object-fit: contain;
  object-position: center top;
  transform: none !important;
  filter: none;
  image-rendering: auto;
}
@media (max-width: 700px) {
  .imageLayer img {
    flex-basis: 100%;
    width: 100%;
    min-width: 100%;
  }
}
`;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(root, 'f1_wallpaper_yedek', `ProfileWallpaperBackdrop.module.${stamp}.css`);
fs.mkdirSync(path.dirname(backup), { recursive: true });
fs.copyFileSync(file, backup);
try {
  fs.writeFileSync(file, css + '\n' + patch, 'utf8');
  console.log('BASARILI: Arka plan dengeli olcege alindi.');
  console.log('GUNCELLENDI: components/ProfileWallpaperBackdrop.module.css');
  console.log('YEDEK: ' + backup);
  console.log('Simdi profil sayfasini Ctrl+F5 ile yenile.');
} catch (e) {
  fs.copyFileSync(backup, file);
  console.error('HATA: Dosya guncellenemedi, yedekten geri yuklendi. ' + e.message);
  process.exit(1);
}
