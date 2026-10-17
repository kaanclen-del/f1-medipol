#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(message)=>{console.error('\n❌ KURULUM DURDU: '+message);process.exit(1);};
const sha=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Önce F1 Medipol proje kök klasörüne geç.');
let pkg;
try{pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}
catch{fail('package.json okunamıyor.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)fail('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const actions=[];
// Validate ALL files before changing ANY source file.
for(const item of manifest.files){
 const file=path.join(root,item.path);
 const source=path.join(__dirname,'payload',item.asset);
 if(!fs.existsSync(file))fail('Proje dosyası bulunamadı: '+item.path);
 if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==item.sha256)fail('Paket dosyası bozuk/eksik: '+item.asset);
 const actual=sha(fs.readFileSync(file));
 if(actual!==item.sha256&&!item.allowedOriginalSha256.includes(actual)){
  fail('Uyumsuz kaynak sürümü: '+item.path+'\nBulunan SHA-256: '+actual+'\nBeklenen: Graphics 3.3 (venueAudio: Graphics 2.8). Henüz hiçbir dosya değiştirilmedi.');
 }
 actions.push({item,file,source,actual,skip:actual===item.sha256});
}
const pending=actions.filter(x=>!x.skip);
if(!pending.length){console.log('✅ Kart Rush 3.4 zaten kurulu. Değişiklik yapılmadı.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g34-final-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of pending){
  const dst=path.join(backup,a.item.path);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(a.file,dst);
 }
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:pending.map(x=>({path:x.item.path,installedSha:x.item.sha256,oldSha:x.actual}))},null,2),'utf8');
}catch(error){fail('Dosya yedeği alınamadı: '+error.message);}
const updated=[];
try{
 for(const a of pending){
  const temp=a.file+'.g34-temp';
  fs.copyFileSync(a.source,temp);
  if(sha(fs.readFileSync(temp))!==a.item.sha256)throw Error('Doğrulama hatası: '+a.item.path);
  fs.renameSync(temp,a.file);updated.push(a);
  console.log('✓ '+a.item.path);
 }
}catch(error){
 for(const a of updated.reverse())try{fs.copyFileSync(path.join(backup,a.item.path),a.file);}catch(e){console.error('Yedek hatası: '+a.item.path,e.message);}
 fail('Kurulum başarısız, dosyalar geri alındı: '+error.message);
}
console.log('\n✅ KART RUSH 3.4 — GRAND FINALE KURULDU');
console.log('15 saniyelik pist turu, risk/ödül kartı, rastgele grid, şiddetli zor AI, kalabalık tribünler, gelişmiş flaş/ses, mobil HUD, tam sıralama ve uzun araç görüşü.');
console.log('Yedek: '+backup);
console.log('Şimdi: npm.cmd run build -- --webpack');
