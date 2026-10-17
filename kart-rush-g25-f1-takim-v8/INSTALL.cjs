#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd(),pack=__dirname;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function fail(message){console.error('\n❌ KURULUM DURDU: '+message);process.exit(1);}
const pkgFile=path.join(root,'package.json');
if(!fs.existsSync(pkgFile))fail('Terminali f1-medipol projesinin ana klasöründe açmalısın.');
let project;try{project=JSON.parse(fs.readFileSync(pkgFile,'utf8'));}catch{fail('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
const changes=[];
// Strict preflight ALL FILES before writing any; no --force mode intentionally.
for(const f of manifest.files){
 const source=path.join(pack,'payload',f.asset),target=path.join(root,f.dest);
 if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==f.sha)fail('Paket dosyası eksik veya bozuk: '+f.asset);
 if(!fs.existsSync(target))fail('Projede gereken dosya yok: '+f.dest);
 const existing=sha(fs.readFileSync(target));
 if(existing===f.sha)continue;
 if(!f.allowedSha.includes(existing))fail(f.dest+' referans sürümle eşleşmiyor. Güvenlik için hiçbir dosya değişmedi. Güncel klasörü ZIP olarak yüklemen gerekir.');
 changes.push({f,source,target});
}
if(changes.length===0){console.log('✅ Graphics 2.5 zaten kurulu. Dosyalar değişmedi.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g25-f1-takim-v8-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const change of changes){
  const targetBackup=path.join(backup,change.f.dest);
  fs.mkdirSync(path.dirname(targetBackup),{recursive:true});
  fs.copyFileSync(change.target,targetBackup);
 }
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:changes.map(c=>c.f.dest)},null,2));
}catch(e){fail('Yedek alınamadı, hiçbir şey değiştirilmedi: '+e.message);}
const written=[];
try{
 for(const change of changes){
  const temp=change.target+'.g25-tmp';
  fs.writeFileSync(temp,fs.readFileSync(change.source));
  fs.renameSync(temp,change.target);
  written.push(change);
  if(sha(fs.readFileSync(change.target))!==change.f.sha)throw Error('Yazma kontrolü başarısız: '+change.f.dest);
  console.log('✓ '+change.f.dest);
 }
}catch(e){
 for(const change of written.reverse()){
  try{fs.copyFileSync(path.join(backup,change.f.dest),change.target);}catch(err){console.error('⚠ Geri yükleme başarısız: '+change.f.dest+' '+err.message);}
 }
 fail('Kurulum geri alındı: '+e.message);
}
console.log('\n✅ GRAPHICS 2.5 — 11 F1 TAKIMI + GÖVDE KAPLAMALARI + V8 SES KURULDU');
console.log('Graphics 2.3 pist ve stadyum dokuları korundu; Graphics 2.4 araç/gökyüzü geliştirmeleri de bu sürüme dahil.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
