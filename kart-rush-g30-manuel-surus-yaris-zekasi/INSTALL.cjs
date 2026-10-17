#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const pack=__dirname;
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const die=message=>{console.error('\n❌ KURULUM DURDURULDU: '+message);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))die('Önce VS Code terminalinde F1 Medipol proje ana klasörüne gir.');
let pkg;try{pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{die('package.json okunamadı.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)die('Next.js projesi bulunamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
const actions=[];
for(const f of manifest.files){
 const target=path.join(root,f.dest),payload=path.join(pack,'payload',f.asset);
 if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==f.sha)die('ZIP paketi bozuk veya eksik: '+f.asset);
 if(!fs.existsSync(target))die('Oyun dosyası eksik: '+f.dest);
 const current=sha(fs.readFileSync(target));
 if(current!==f.sha&&!f.allowedOriginalSha.includes(current))die(f.dest+' tanınmayan bir sürümde. Mevcut çalışman korunuyor. Lütfen dosyayı gönder, üzerine yazmayalım.');
 actions.push({...f,target,payload,current,skip:current===f.sha});
}
const changes=actions.filter(a=>!a.skip);
if(!changes.length){console.log('✅ Graphics 3.0 zaten kurulu; dosyalar değişmedi.');process.exit(0);}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','g30-manuel-yaris-'+stamp);
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const a of changes){
  const dest=path.join(backup,a.dest);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(a.target,dest);
 }
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:changes.map(a=>({dest:a.dest,installedSha:a.sha,previousSha:a.current}))},null,2),'utf8');
}catch(e){die('Yedek alınamadı; hiçbir oyun dosyası değiştirilmedi: '+e.message);}
const written=[];
try{
 for(const a of changes){
  const temp=a.target+'.g30-tmp';
  fs.writeFileSync(temp,fs.readFileSync(a.payload));
  fs.renameSync(temp,a.target);
  written.push(a);
  if(sha(fs.readFileSync(a.target))!==a.sha)throw Error('Kurulum SHA kontrolü başarısız: '+a.dest);
  console.log('✓ '+a.dest);
 }
}catch(e){
 for(const a of written.reverse())try{fs.copyFileSync(path.join(backup,a.dest),a.target);}catch(rollback){console.error('⚠ Geri alma hatası: '+rollback.message);}
 die('Yazma hatası, değişiklikler yedeklerden geri alındı: '+e.message);
}
console.log('\n✅ KART RUSH G3.0 — MANUEL SÜRÜŞ + AKILLI SOLLAMA + VİRAJLAR + DİNAMİK SES KURULDU');
console.log('Yedek: '+backup);
console.log('Yalnızca 3 oyun dosyası güncellendi, pist materyal PNG\'leri ve şampiyona verileri korunuyor.');
console.log('Kontrol: npm.cmd run build -- --webpack');
