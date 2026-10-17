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
let project;try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{die('package.json okunamadı.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)die('Next.js projesi doğrulanamadı.');
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json'),'utf8'));
const fileInfo=manifest.files[0];
const target=path.join(root,fileInfo.dest);
const payload=path.join(pack,'payload',fileInfo.asset);
if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==fileInfo.sha)die('Paket bozuk veya eksik.');
if(!fs.existsSync(target))die(fileInfo.dest+' bulunamadı. Önce Kart Rush kurulu olmalı.');
const currentSha=sha(fs.readFileSync(target));
if(currentSha===fileInfo.sha){console.log('✅ Graphics 2.4 zaten kurulu, dosya değişmedi.');process.exit(0);}
if(fileInfo.allowedOriginalSha && currentSha!==fileInfo.allowedOriginalSha)die(fileInfo.dest+' beklenen Graphics 2.3 sürümünde değil. Güvenlik için üzerine yazılmadı.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','graphics2-arac-gokyuzu-v2-4-'+stamp);
try{
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.mkdirSync(backup,{recursive:true});
 const backupFile=path.join(backup,'engine.ts');
 fs.copyFileSync(target,backupFile);
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({files:[{dest:fileInfo.dest,backup:'engine.ts'}]},null,2),'utf8');
 const temp=target+'.g24-tmp';
 fs.writeFileSync(temp,fs.readFileSync(payload));
 fs.renameSync(temp,target);
 if(sha(fs.readFileSync(target))!==fileInfo.sha)throw Error('Yazım doğrulaması başarısız.');
 console.log('✓ '+fileInfo.dest);
 console.log('\n✅ GRAPHICS 2.4 — ARAÇ FORMU + GÖKYÜZÜ UPGRADE KURULDU');
 console.log('Araç gövdeleri inceldi, rakip araçlar daha F1 benzeri hale geldi, gökyüzü daha katmanlı ve kaliteli oldu.');
 console.log('Yedek: '+backup);
 console.log('Kontrol: npm.cmd run build -- --webpack');
}catch(e){
 try{
  const backupFile=path.join(backup,'engine.ts');
  if(fs.existsSync(backupFile))fs.copyFileSync(backupFile,target);
 }catch{}
 die('Kurulum tamamlanamadı, değişiklikler geri alındı: '+e.message);
}
