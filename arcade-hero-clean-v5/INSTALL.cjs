'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = path.join(__dirname, 'app', 'arcade');
const fail = (message) => { console.error('\n❌ KURULUM DURDU: ' + message); process.exit(1); };

if (!fs.existsSync(path.join(root, 'package.json'))) fail('package.json bulunamadı. Terminali f1-medipol ana klasöründe aç.');
if (!fs.existsSync(path.join(source, 'page.tsx')) || !fs.existsSync(path.join(source, 'arcade.module.css'))) fail('ZIP eksik açılmış. arcade-hero-clean-v5 klasörünün içeriğini kontrol et.');

const candidates = [path.join(root, 'app','arcade'), path.join(root,'src','app','arcade')];
const targetDir = candidates.find(dir => fs.existsSync(path.join(dir,'page.tsx')));
if (!targetDir) fail('app/arcade/page.tsx bulunamadı. Yanlış proje klasöründesin gibi görünüyor.');

const pageTarget = path.join(targetDir,'page.tsx');
const cssTarget = path.join(targetDir,'arcade.module.css');
const previousPage = fs.readFileSync(pageTarget,'utf8');
const previousCss = fs.existsSync(cssTarget) ? fs.readFileSync(cssTarget,'utf8') : null;
let page = fs.readFileSync(path.join(source,'page.tsx'),'utf8');
const css = fs.readFileSync(path.join(source,'arcade.module.css'),'utf8');

const routeMatches = [...previousPage.matchAll(/\/arcade\/(?:[a-z\d_-]+)(?:\/[a-z\d_-]+)*/gi)].map(m => m[0]);
const uniqueRoutes = [...new Set(routeMatches)].filter(x => !x.includes('/lobbies/') && !x.includes('/api/'));
const targets = [
  { key: 'manager', default: '/arcade/manager', options: ['manager'] },
  { key: 'what-if', default: '/arcade/what-if', options: ['what-if','whatif','scenario'] },
  { key: 'kart-rush', default: '/arcade/kart-rush', options: ['kart-rush','kartrush'] },
];
for (const game of targets) {
  const alternatives = uniqueRoutes.filter(route => game.options.some(key => route.toLowerCase().split('/').includes(key)));
  const oldRoute = alternatives.sort((a,b)=>a.length-b.length)[0] ?? game.default;
  if (oldRoute !== game.default) page = page.replace(`href: \"${game.default}\"`, `href: ${JSON.stringify(oldRoute)}`);
}

if (previousPage === page && previousCss === css) {
  console.log('✅ Arcade hero temiz sürüm zaten kurulu. Hiçbir değişiklik yapılmadı.');
  process.exit(0);
}

const backupDir = path.join(root,'.arcade-backups','hero-clean-'+new Date().toISOString().replace(/[:.]/g,'-'));
try {
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(pageTarget,path.join(backupDir,'page.tsx'));
  if (previousCss !== null) fs.copyFileSync(cssTarget,path.join(backupDir,'arcade.module.css'));
  fs.writeFileSync(path.join(backupDir,'backup-info.json'), JSON.stringify({targetDir, installedAt: new Date().toISOString()}, null, 2), 'utf8');
} catch (e) { fail('Yedek oluşturulamadı: ' + e.message); }

try {
  fs.writeFileSync(pageTarget, page, 'utf8');
  fs.writeFileSync(cssTarget, css, 'utf8');
} catch (e) {
  try {
    fs.copyFileSync(path.join(backupDir,'page.tsx'), pageTarget);
    if (previousCss !== null) fs.copyFileSync(path.join(backupDir,'arcade.module.css'), cssTarget);
  } catch {}
  fail('Dosyalar yazılamadı: ' + e.message);
}

console.log('\n✅ ARCADE HERO TEMİZLEME V5 KURULDU');
console.log('• Sol ve sağ mini kutular kaldırıldı.');
console.log('• OYUN BAŞLASIN yazısı boş alanın içine daha sağlıklı yerleştirildi.');
console.log('• Header korunuyor, kart tasarımı aynen devam ediyor.');
console.log('Yedek:', backupDir);
console.log('Sayfayı Ctrl + Shift + R ile yenile.');
