// F1 MEDIPOL — 15 hareketli profil arka plani, guvenli kurulum.
// Proje klasorunde calistirin: node .\__profile15\INSTALL.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const base = __dirname;
const tasks = [];

function fail(text) {
  console.error('\nKURULUM DURDURULDU: ' + text);
  process.exit(1);
}
function readProject(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) fail('Gerekli proje dosyasi bulunamadi: ' + file);
  return fs.readFileSync(full, 'utf8');
}
function addTask(file, content) {
  const full = path.join(root, file);
  const original = fs.existsSync(full) ? fs.readFileSync(full) : null;
  const target = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  if (original && original.equals(target)) return;
  tasks.push({file, full, original, target});
}

const sourceFile = 'lib/profile-wallpapers.ts';
let lib = readProject(sourceFile);
const canonical = fs.readFileSync(path.join(base, 'data/base_wallpapers.ts'), 'utf8');
const blockPattern = /^  \{\s*\n\s*id:\s*"([^\"]+)",[\s\S]*?^  \},/gm;
const list = [...canonical.matchAll(blockPattern)].map((m) => ({id:m[1], text:m[0]}));
if (list.length !== 15) fail('Paket hatasi: arka plan sayisi 15 degil.');
const listStart = lib.indexOf('export const PROFILE_WALLPAPERS');
if (listStart === -1) fail('Profil arka plani listesi bulunamadi; mevcut dosya farkli.');
const listEnd = lib.indexOf('\n];', listStart);
if (listEnd === -1) fail('Arka plan listesi sonu bulunamadi; dosyaya dokunulmadi.');
const existingPart = lib.slice(listStart, listEnd);
const existing = new Set([...existingPart.matchAll(/\bid:\s*["']([^"']+)["']/g)].map((x)=>x[1]));
const missing = list.filter(({id})=>!existing.has(id));
if (existing.size > 15) {
  fail(`Mevcut ${existing.size} arka plan var. Otomatik silme yapilmadi; projeni paylas.`);
}
if (missing.length) {
  // Listenin son elemanindan hemen once, onceki ID'leri koruyarak ekle.
  lib = lib.slice(0, listEnd) + '\n' + missing.map((entry)=>entry.text).join('\n') + lib.slice(listEnd);
}
addTask(sourceFile, lib);

const profileFile = 'app/profile/page.tsx';
let profile = readProject(profileFile);
const importLine = 'import ProfileWallpaperBackdrop from "@/components/ProfileWallpaperBackdrop";';
if (!profile.includes(importLine)) {
  const anchor = /import Header from ["']@\/components\/Header["'];?/;
  if (!anchor.test(profile)) fail('Profil sayfasinda Header importu bulunamadi.');
  profile = profile.replace(anchor, (found) => `${found}\n${importLine}`);
}
const oldLayer = /<div\s+className=["']profile-wallpaper-layer["']\s+aria-hidden=["']true["']\s+style=\{\{\s*backgroundImage:\s*background\s*\}\}\s*\/>/;
if (oldLayer.test(profile)) {
  profile = profile.replace(oldLayer, '<ProfileWallpaperBackdrop wallpaper={wallpaper} />');
} else if (!profile.includes('<ProfileWallpaperBackdrop wallpaper={wallpaper} />')) {
  fail('Profil duvar kagidi katmani beklenenden farkli. Guncel app/profile/page.tsx dosyasi gerekli.');
}
profile = profile.replace(/\/profile\/edit#wallpaper/g, '/profile/wallpapers');
addTask(profileFile, profile);

for (const file of [
  'components/ProfileWallpaperBackdrop.tsx',
  'components/ProfileWallpaperBackdrop.module.css',
  'app/profile/wallpapers/page.tsx',
  'app/profile/wallpapers/wallpapers.module.css',
]) {
  addTask(file, fs.readFileSync(path.join(base, file)));
}

// TUM dogrulamalar basarili olursa yedekle ve uygula.
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const backups = path.join(process.env.USERPROFILE || process.env.HOME || root, 'Downloads', 'f1-profile15-yedek-' + stamp);
for (const task of tasks) {
  if (task.original) {
    const backup = path.join(backups, task.file);
    fs.mkdirSync(path.dirname(backup), {recursive:true});
    fs.writeFileSync(backup,task.original);
  }
}
for (const task of tasks) {
  fs.mkdirSync(path.dirname(task.full), {recursive:true});
  fs.writeFileSync(task.full,task.target);
  console.log('GUNCELLENDI:',task.file);
}
console.log('\nKURULUM TAMAMLANDI. 15 ARKA PLAN HAZIR.');
console.log('Yedek:',backups);
console.log('Adres: /profile/wallpapers');
console.log('Calistirma: npm.cmd run dev -- --webpack');
