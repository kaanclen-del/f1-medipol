'use strict';
// F1 Medipol Arcade visual upgrade. Run only from the Next.js project root.
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = path.join(__dirname, 'app', 'arcade');
const packageJson = path.join(root, 'package.json');
const fail = (message) => { console.error('\n❌ KURULUM DURDU: ' + message); process.exit(1); };

if (!fs.existsSync(packageJson)) fail('package.json bulunamadı. Terminali f1-medipol ana klasöründe aç.');
if (!fs.existsSync(path.join(source, 'page.tsx')) || !fs.existsSync(path.join(source, 'arcade.module.css'))) {
  fail('ZIP eksik açılmış. arcade-vitrin-v2 klasörünün içindeki app/arcade dosyalarını kontrol et.');
}
let project;
try { project = JSON.parse(fs.readFileSync(packageJson,'utf8')); }
catch { fail('package.json okunamadı.'); }
if (!project.dependencies?.next && !project.devDependencies?.next) {
  fail('Bu klasör bir Next.js projesi gibi görünmüyor.');
}
const candidates = [path.join(root, 'app','arcade'), path.join(root,'src','app','arcade')];
const targetDir = candidates.find(dir=>fs.existsSync(path.join(dir,'page.tsx')));
if (!targetDir) fail('Mevcut app/arcade/page.tsx bulunamadı. Yanlış proje klasörü olabilir; güvenlik için dosya oluşturulmadı.');
const pageTarget = path.join(targetDir,'page.tsx');
const cssTarget = path.join(targetDir,'arcade.module.css');
const previous = fs.readFileSync(pageTarget,'utf8');
let page = fs.readFileSync(path.join(source,'page.tsx'),'utf8');
const css = fs.readFileSync(path.join(source,'arcade.module.css'),'utf8');

// Prefer the navigation routes from the existing page over any default routes in the visual template.
const routeMatches = [...previous.matchAll(/\/arcade\/(?:[a-z\d_-]+)(?:\/[a-z\d_-]+)*/gi)].map(m=>m[0]);
const uniqueRoutes = [...new Set(routeMatches)].filter(x=>!x.includes('/lobbies/') && !x.includes('/api/'));
const targets = [
 { key:'manager', default:'/arcade/manager', options:['manager'] },
 { key:'what-if', default:'/arcade/what-if', options:['what-if','whatif','scenario'] },
 { key:'kart-rush', default:'/arcade/kart-rush', options:['kart-rush','kartrush'] },
];
const chosen = [];
for (const game of targets) {
 const alternatives = uniqueRoutes.filter(route=>game.options.some(key => route.toLowerCase().split('/').includes(key)));
 const oldRoute = alternatives.sort((a,b)=>a.length-b.length)[0] ?? game.default;
 if(oldRoute!==game.default) page=page.replace(`href: "${game.default}"`, `href: ${JSON.stringify(oldRoute)}`);
 chosen.push(`${game.key}: ${oldRoute}`);
}
const priorCss = fs.existsSync(cssTarget) ? fs.readFileSync(cssTarget,'utf8') : null;
if (previous === page && priorCss === css) {
 console.log('\n✅ Arcade vitrini zaten güncel. Yeni değişiklik yapılmadı.');
 process.exit(0);
}
const backupDir = path.join(root,'.arcade-backups','vitrin-'+new Date().toISOString().replace(/[:.]/g,'-'));
try {
 fs.mkdirSync(backupDir,{recursive:true});
 fs.copyFileSync(pageTarget,path.join(backupDir,'page.tsx'));
 if(priorCss!==null) fs.copyFileSync(cssTarget,path.join(backupDir,'arcade.module.css'));
 fs.writeFileSync(path.join(backupDir,'backup-info.json'),JSON.stringify({targetDir,hadCss:priorCss!==null,installedAt:new Date().toISOString()},null,2),'utf8');
} catch(e) { fail('Yedek oluşturulamadı, değişiklik yapılmadı: '+e.message); }
try {
 fs.writeFileSync(pageTarget,page,'utf8');
 fs.writeFileSync(cssTarget,css,'utf8');
} catch (e) {
 try {
  fs.copyFileSync(path.join(backupDir,'page.tsx'),pageTarget);
  if(priorCss!==null) fs.copyFileSync(path.join(backupDir,'arcade.module.css'),cssTarget);
  else if(fs.existsSync(cssTarget)) fs.unlinkSync(cssTarget);
 } catch (restoreError) { console.error('⚠️ Otomatik geri alma başarısız. Yedek:',backupDir, restoreError.message); }
 fail('Dosyalar yazılırken hata oldu: '+e.message);
}
console.log('\n✅ F1 MEDIPOL — ARCADE VITRIN V2 KURULDU');
console.log('Değişen dosyalar:',pageTarget,'ve',cssTarget);
console.log('Oyun yönlendirmeleri:',chosen.join(' | '));
console.log('Yedek:',backupDir);
console.log('Sayfayı yenile: Ctrl + Shift + R');
console.log('Geri almak için: node .\\arcade-vitrin-v2\\RESTORE.cjs');
