'use strict';
// F1 Medipol Arcade V6 + Go-Kart Zaman Merkezi installer.
// Run at project root: node .\arcade-gokart-v6\INSTALL.cjs
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=message=>{console.error('\n❌ KURULUM DURDU: '+message);process.exit(1)};
if(!fs.existsSync(path.join(root,'package.json')))fail('package.json yok. Terminali f1-medipol ana klasöründe aç.');
const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(!(p.dependencies?.next||p.devDependencies?.next))fail('Next.js projesi bulunamadı.');
const candidates=[path.join(root,'app'),path.join(root,'src','app')];
const appDir=candidates.find(dir=>fs.existsSync(path.join(dir,'arcade','page.tsx')));
if(!appDir)fail('app/arcade/page.tsx bulunamadı. Yanlış dizindesin.');
const headerPaths=[path.join(root,'components','Header.tsx'),path.join(root,'components','Header.jsx'),path.join(root,'components','Header.js'),path.join(root,'src','components','Header.tsx'),path.join(root,'src','components','Header.jsx'),path.join(root,'src','components','Header.js')];
if(!headerPaths.some(file=>fs.existsSync(file)))fail('components/Header bulunamadı; mevcut Header düzenini bozabilecek kurulum yapılmadı.');
const sourceDir=path.join(__dirname,'app','arcade');
const names=[
 ['page.tsx','page.tsx'],
 ['arcade.module.css','arcade.module.css'],
 ['gokart-zamanlama/page.tsx','gokart-zamanlama/page.tsx'],
 ['gokart-zamanlama/TimingClient.tsx','gokart-zamanlama/TimingClient.tsx'],
 ['gokart-zamanlama/timing-utils.ts','gokart-zamanlama/timing-utils.ts'],
 ['gokart-zamanlama/timing.module.css','gokart-zamanlama/timing.module.css'],
];
const entries=names.map(([src,dest])=>({src:path.join(sourceDir,src),dest:path.join(appDir,'arcade',dest),rel:dest}));
for(const entry of entries)if(!fs.existsSync(entry.src))fail('ZIP içeriği eksik: '+entry.rel);
const originalPage=fs.readFileSync(path.join(appDir,'arcade','page.tsx'),'utf8');
let newPage=fs.readFileSync(entries[0].src,'utf8');
// Preserve the user's earlier discovered game routes.
const routes=[...new Set([...originalPage.matchAll(/\/arcade\/(?:[a-z\d_-]+)(?:\/[a-z\d_-]+)*/gi)].map(m=>m[0]))];
for(const game of [
 {base:'/arcade/manager',keys:['manager']},
 {base:'/arcade/what-if',keys:['what-if','whatif','scenario']},
 {base:'/arcade/kart-rush',keys:['kart-rush','kartrush']},
]){
 const found=routes.filter(r=>game.keys.some(k=>r.toLowerCase().split('/').includes(k))).sort((a,b)=>a.length-b.length)[0];
 if(found&&found!==game.base)newPage=newPage.replace(`href: "${game.base}"`,`href: ${JSON.stringify(found)}`);
}
const contents=new Map(entries.map(e=>[e.dest,e===entries[0]?newPage:fs.readFileSync(e.src,'utf8')]));
const same=entries.every(e=>fs.existsSync(e.dest)&&fs.readFileSync(e.dest,'utf8')===contents.get(e.dest));
if(same){console.log('\n✅ Arcade V6 ve Go-Kart Timing zaten kurulu. Değişiklik yapılmadı.');process.exit(0)}
const backupDir=path.join(root,'.arcade-backups','gokart-v6-'+new Date().toISOString().replace(/[:.]/g,'-'));
const meta={version:'arcade-gokart-v6',appDir,created:new Date().toISOString(),entries:[]};
try{
 fs.mkdirSync(backupDir,{recursive:true});
 for(const e of entries){
  const exists=fs.existsSync(e.dest);
  const backup=path.join(backupDir,e.rel);
  if(exists){fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(e.dest,backup)}
  meta.entries.push({rel:e.rel,hadOriginal:exists});
 }
 fs.writeFileSync(path.join(backupDir,'backup.json'),JSON.stringify(meta,null,2),'utf8');
}catch(err){fail('Yedek alınamadı; kurulum başlamadı: '+err.message)}
const written=[];
try{
 for(const e of entries){
  fs.mkdirSync(path.dirname(e.dest),{recursive:true});
  const tmp=e.dest+'.arcade-v6-tmp';
  try{fs.writeFileSync(tmp,contents.get(e.dest),'utf8');fs.renameSync(tmp,e.dest)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
  written.push(e);
 }
}catch(err){
 for(const e of written.reverse()){
  try{
   const prior=meta.entries.find(x=>x.rel===e.rel);
   if(prior?.hadOriginal)fs.copyFileSync(path.join(backupDir,e.rel),e.dest);
   else fs.rmSync(e.dest,{force:true});
  }catch(restoreErr){console.error('Geri alınamadı:',e.rel,restoreErr.message)}
 }
 fail('Dosyalar yazılamadı; mümkün olanlar geri alındı. '+err.message);
}
console.log('\n✅ F1 MEDIPOL — ARCADE V6 + GO-KART TIMING KURULDU');
console.log('• Arcade: küçük, ortalanmış OYUN BAŞLASIN. bannerı, dört oyun kartı');
console.log('• Go-Kart: /arcade/gokart-zamanlama');
console.log('• Sürücü ekleme, kronometre, manuel tur, ceza, sıralama, CSV');
console.log('• Header ve diğer oyunların dosyaları korundu.');
console.log('Yedek:',backupDir);
console.log('Sayfayı Ctrl + Shift + R ile yenile.');
