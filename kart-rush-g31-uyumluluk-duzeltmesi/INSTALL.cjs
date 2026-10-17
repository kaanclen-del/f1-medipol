#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd(),pack=__dirname;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const die=message=>{console.error('\n❌ KURULUM DURDU: '+message);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))die('Önce F1 Medipol proje kök klasörüne geç.');
let project;try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{die('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)die('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
const actions=[];
for(const item of manifest.files){
 const target=path.join(root,item.dest);
 if(!fs.existsSync(target))die('Hedef bulunamadı: '+item.dest);
 const current=sha(fs.readFileSync(target));
 let resolved=null;
 if(Array.isArray(item.variants)){
  const choices=item.variants.map(v=>({
   originalSha:v.originalSha,
   asset:v.asset,
   sha:v.targetSha
  }));
  resolved=choices.find(v=>v.originalSha===current)||choices.find(v=>v.sha===current);
  if(!resolved)die('Uyumsuz '+item.dest+'\nBulunan SHA-256: '+current+'\nBu dosya tanınan Graphics 2.6 / 2.7 sürümlerinden farklı. Dosyanı koruduk. Bu SHA değerini bize gönder.');
 } else {
  resolved={asset:item.asset,sha:item.sha};
  if(current!==item.sha&&!item.allowedOriginalSha.includes(current))
   die('Uyumsuz '+item.dest+'\nBulunan SHA-256: '+current+'\nGraphics 3.0 sürümüne uygun değil. Dosyaya dokunulmadı.');
 }
 const payload=path.join(pack,'payload',resolved.asset);
 if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==resolved.sha)die('Paket bozuk: '+resolved.asset);
 actions.push({item,target,payload,sha:resolved.sha,skip:current===resolved.sha});
}
const changes=actions.filter(a=>!a.skip);
if(!changes.length){console.log('✅ Kart Rush 3.1.1 zaten kurulu. Dosyalar değiştirilmedi.');process.exit(0);}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','g31-uyumluluk-duzeltmesi-'+stamp);
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of changes){const backupFile=path.join(backup,a.item.dest);fs.mkdirSync(path.dirname(backupFile),{recursive:true});fs.copyFileSync(a.target,backupFile);}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:changes.map(a=>({dest:a.item.dest,installedSha:a.sha}))},null,2),'utf8');
}catch(e){die('Yedek alınamadı, hiçbir dosya değiştirilmedi: '+e.message);}
const done=[];
try{
 for(const a of changes){
  const temp=a.target+'.g311-tmp';fs.copyFileSync(a.payload,temp);fs.renameSync(temp,a.target);done.push(a);
  if(sha(fs.readFileSync(a.target))!==a.sha)throw Error('Dosya doğrulaması başarısız: '+a.item.dest);
  console.log('✓ '+a.item.dest);
 }
}catch(e){
 for(const a of done.reverse()){try{fs.copyFileSync(path.join(backup,a.item.dest),a.target);}catch(err){console.error('Geri alma hatası: '+err.message);}}
 die('Kurulum geri alındı: '+e.message);
}
console.log('\n✅ KART RUSH 3.1.1 — CLIENT UYUM DÜZELTMESİ KURULDU');
console.log('Graphics 2.7 ses kaynak bilgisi korundu; yağmur menüsü ve yeni yarış kodu eklendi.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
console.log('Çevrimiçi yağmur için SUPABASE_WEATHER.sql ayrıca çalıştırılmalı.');
