'use strict';
// F1 Medipol Arcade V2: restore the shared site Header without replacing the page.
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
function fail(message) { console.error('\n❌ HEADER ONARIMI DURDU: ' + message); process.exit(1); }
if (!fs.existsSync(path.join(root, 'package.json'))) fail('Terminali package.json dosyasının bulunduğu f1-medipol ana klasöründe aç.');

const dirs = [path.join(root,'app','arcade'), path.join(root,'src','app','arcade')];
const arcadeDir = dirs.find(dir => fs.existsSync(path.join(dir,'page.tsx')));
if (!arcadeDir) fail('app/arcade/page.tsx bulunamadı; hiçbir dosya değiştirilmedi.');
const pageFile = path.join(arcadeDir,'page.tsx');
const headerCandidates = [
 path.join(root,'components','Header.tsx'), path.join(root,'components','Header.jsx'),
 path.join(root,'components','Header.ts'), path.join(root,'components','Header.js'),
 path.join(root,'src','components','Header.tsx'), path.join(root,'src','components','Header.jsx'),
 path.join(root,'src','components','Header.ts'), path.join(root,'src','components','Header.js'),
];
if (!headerCandidates.some(file => fs.existsSync(file))) fail('components/Header bileşeni bulunamadı. Mevcut dosyaları değiştirmedim.');

const original = fs.readFileSync(pageFile,'utf8');
if (/<Header\b[^>]*\/>/.test(original)) {
 console.log('✅ Arcade sayfasında Header zaten mevcut. Değişiklik yapılmadı.');
 process.exit(0);
}
// Only patch the Arcade V2 file; guard against overwriting a different/newer page.
if (!/export\s+default\s+function\s+ArcadePage\s*\(/.test(original) ||
    !/import\s+styles\s+from\s+["']\.\/arcade\.module\.css["']/.test(original) ||
    !/<main\s+className=\{styles\.page\}>/.test(original)) {
 fail('Sayfa Arcade V2 ile eşleşmiyor. Güvenlik için değişiklik yapılmadı.');
}
let updated = original;
if (!/import\s+Header\s+from\s+["']@\/components\/Header["']/.test(updated)) {
 updated = 'import Header from "@/components/Header";\n' + updated;
}
const opening = /return\s*\(\s*<main\s+className=\{styles\.page\}>/;
if (!opening.test(updated)) fail('Arcade ana return bölümü bulunamadı. Hiçbir değişiklik yapılmadı.');
updated = updated.replace(opening, 'return (\n    <>\n      <Header />\n      <main className={styles.page}>');
const closing = /<\/main>\s*\);\s*\}\s*$/;
if (!closing.test(updated)) fail('Arcade sayfa kapanışı beklenen yapıda değil. Hiçbir değişiklik yapılmadı.');
updated = updated.replace(closing, '</main>\n    </>\n  );\n}\n');
if (original.includes('\r\n')) updated = updated.replace(/\r?\n/g,'\r\n');

const backupDir = path.join(root,'.arcade-backups','header-onarimi-'+new Date().toISOString().replace(/[:.]/g,'-'));
try {
 fs.mkdirSync(backupDir,{recursive:true});
 fs.copyFileSync(pageFile,path.join(backupDir,'page.tsx'));
 fs.writeFileSync(path.join(backupDir,'restore-info.json'),JSON.stringify({root,pageFile,createdAt:new Date().toISOString()},null,2),'utf8');
 const temp = pageFile + '.arcade-header-tmp';
 try {fs.writeFileSync(temp,updated,'utf8'); fs.renameSync(temp,pageFile);} finally {if(fs.existsSync(temp)) fs.unlinkSync(temp);}
} catch(error) {
 try {if(fs.existsSync(path.join(backupDir,'page.tsx'))) fs.copyFileSync(path.join(backupDir,'page.tsx'),pageFile);} catch(ignored){}
 fail('Dosya yazılamadı: '+error.message);
}
console.log('\n✅ F1 MEDİPOL ARCADE HEADER GERİ GETİRİLDİ');
console.log('Düzenlenen tek dosya: '+pageFile);
console.log('Kartlar, CSS, oyun yolları ve mevcut Header bileşeni aynen korundu.');
console.log('Yedek: '+backupDir);
console.log('Sayfayı Ctrl + Shift + R ile yenile.');
