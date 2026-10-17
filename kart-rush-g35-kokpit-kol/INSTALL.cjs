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
// All files and version checks are completed BEFORE any source is modified.
for(const item of manifest.files){
 const file=path.join(root,item.path);
 const source=path.join(__dirname,'payload',item.asset);
 if(!fs.existsSync(file))fail('Proje dosyası bulunamadı: '+item.path);
 if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==item.sha256)fail('Paket bozuk/eksik: '+item.asset);
 const actual=sha(fs.readFileSync(file));
 if(actual!==item.sha256&&!item.allowedOriginalSha256.includes(actual)){
  fail('Kaynak sürümü uyuşmuyor: '+item.path+'\nBulunan SHA-256: '+actual+'\nGraphics 3.4 kurulu değil veya dosya sonradan değiştirilmiş. Hiçbir dosya üzerine yazılmadı.');
 }
 actions.push({item,file,source,actual,skip:actual===item.sha256});
}
const pending=actions.filter(a=>!a.skip);
if(!pending.length){console.log('✅ Kart Rush 3.5 zaten kurulu, dosya değişmedi.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g35-kokpit-kol-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of pending){const dst=path.join(backup,a.item.path);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(a.file,dst);}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:pending.map(a=>({path:a.item.path,installedSha:a.item.sha256,oldSha:a.actual}))},null,2),'utf8');
}catch(err){fail('Yedek alınamadı. Kurulum yapılmadı: '+err.message);}
const updated=[];
try{
 for(const a of pending){
  const tmp=a.file+'.g35-tmp';
  fs.copyFileSync(a.source,tmp);
  if(sha(fs.readFileSync(tmp))!==a.item.sha256)throw Error('Yazım doğrulaması hatası: '+a.item.path);
  fs.renameSync(tmp,a.file);updated.push(a);
  console.log('✓ '+a.item.path);
 }
}catch(error){
 for(const a of updated.reverse())try{fs.copyFileSync(path.join(backup,a.item.path),a.file);}catch(e){console.error('Geri alma hatası:',a.item.path,e.message);}
 fail('Kurulum hatası, mevcut dosyalar geri alındı: '+error.message);
}
console.log('\n✅ KART RUSH 3.5 — KOKPİT + KOL DESTEĞİ + TRİBÜNLER KURULDU');
console.log('Gökyüzü dünya yönüne sabitlendi, mobil hız göstergesi ayrıldı, gamepad profilleri, 3B kokpit, animasyonlu güç seçimi ve daha yavaş flyover eklendi.');
console.log('Yedek: '+backup);
console.log('Sonraki adım: npm.cmd run build -- --webpack');
