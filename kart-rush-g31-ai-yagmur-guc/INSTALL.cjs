#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const pack=__dirname;
const die=(message)=>{console.error('\n❌ KURULUM DURDU: '+message);process.exit(1);};
const sha=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))die('Komutu F1 Medipol proje ana klasöründe çalıştır.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}
catch{die('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)die('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
const actions=[];
for(const item of manifest.files){
 const target=path.join(root,item.dest),payload=path.join(pack,'payload',item.asset);
 if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==item.sha)die('Paket bozuk veya eksik: '+item.asset);
 if(!fs.existsSync(target))die('Hedef dosya bulunamadı: '+item.dest);
 const current=sha(fs.readFileSync(target));
 if(current===item.sha){actions.push({...item,target,payload,skip:true});continue;}
 if(!item.allowedOriginalSha.includes(current))die('Uyumsuz kaynak sürümü: '+item.dest+'\nGraphics 3.0 kurulu olmayabilir veya dosyanın farklı sürümü mevcut. Üzerine yazılmadı.');
 actions.push({...item,target,payload,skip:false});
}
const changes=actions.filter(a=>!a.skip);
if(changes.length===0){console.log('✅ Kart Rush 3.1 zaten kurulu; hiçbir dosya değiştirilmedi.');process.exit(0);}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','g31-ai-yagmur-guc-'+stamp);
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of changes){const dest=path.join(backup,a.dest);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(a.target,dest);}
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:changes.map(a=>({dest:a.dest,installedSha:a.sha}))},null,2),'utf8');
}catch(e){die('Yedek alınamadı, hiçbir dosya değiştirilmedi: '+e.message);}
const done=[];
try{
 for(const a of changes){
  const tmp=a.target+'.g31-tmp';fs.copyFileSync(a.payload,tmp);fs.renameSync(tmp,a.target);done.push(a);
  if(sha(fs.readFileSync(a.target))!==a.sha)throw Error('Hash doğrulaması başarısız: '+a.dest);
  console.log('✓ '+a.dest);
 }
}catch(e){
 for(const a of done.reverse())try{fs.copyFileSync(path.join(backup,a.dest),a.target);}catch(err){console.error('⚠ Geri yükleme hatası: '+a.dest+' '+err.message);}
 die('Kurulum geri alındı: '+e.message);
}
console.log('\n✅ KART RUSH G3.1 — AKILLI BOTLAR + YAĞMUR + GÜÇ DENGESİ KURULDU');
console.log('Yedek: '+backup);
console.log('Çevrim içi yağmur senkronizasyonu için paket içindeki SUPABASE_WEATHER.sql dosyasını Supabase SQL Editor’da ayrıca çalıştır.');
console.log('Kontrol: npm.cmd run build -- --webpack');
