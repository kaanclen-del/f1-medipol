'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=process.cwd();const base=path.join(root,'.arcade-backups');
function fail(msg){console.error('\n❌ GERİ ALMA DURDU: '+msg);process.exit(1)}
if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(base))fail('Proje ana dizini veya yedekler bulunamadı.');
const backups=fs.readdirSync(base).filter(n=>n.startsWith('gokart-v6-')).sort();
if(!backups.length)fail('V6 yedeği bulunamadı.');
const folder=path.join(base,backups.at(-1));
const manifestPath=path.join(folder,'backup.json');
if(!fs.existsSync(manifestPath))fail('Yedek kaydı eksik.');
const meta=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
for(const entry of meta.entries){
 const dst=path.join(meta.appDir,'arcade',entry.rel);
 if(entry.hadOriginal){
  const src=path.join(folder,entry.rel);
  if(!fs.existsSync(src))fail('Yedek dosyası eksik: '+entry.rel);
  fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);
 }else fs.rmSync(dst,{force:true});
}
console.log('\n✅ V6 KURULUMU GERİ ALINDI. Yedek:',folder);
console.log('Önemli: Bu işlem yalnızca proje dosyalarını geri alır; tarayıcıdaki Go-Kart oturum verilerini silmez.');
