#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const fail=msg=>{console.error('\n❌ G3.9.2 KURULUM DURDU: '+msg);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Önce F1 Medipol proje köküne geç.');
const dest=path.join(root,m.target),source=path.join(__dirname,m.payload);
if(!fs.existsSync(dest))fail('engine.ts bulunamadı.');
if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==m.to_sha256)fail('ZIP paketi eksik veya bozuk.');
const existing=sha(fs.readFileSync(dest));
if(existing===m.to_sha256){console.log('✅ G3.9.2 zaten yüklü. Dosya değiştirilmedi.');process.exit(0);}
if(!m.allowed_from_sha256.includes(existing))fail('Mevcut engine.ts beklenen G3.9 veya G3.9.1 ile eşleşmiyor.\nBulunan SHA-256: '+existing+'\nHiçbir dosya değiştirilmedi.');
const backup=path.join(root,'.kart-rush-backups','g392-steering-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backupFile=path.join(backup,m.target),tmp=dest+'.g392tmp';
let copied=false;
try{
 fs.mkdirSync(path.dirname(backupFile),{recursive:true});
 fs.copyFileSync(dest,backupFile);copied=true;
 fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({...m,installed_from_sha256:existing},null,2),'utf8');
 fs.copyFileSync(source,tmp);
 if(sha(fs.readFileSync(tmp))!==m.to_sha256)throw Error('Geçici dosya doğrulaması hatası.');
 fs.renameSync(tmp,dest);
 if(sha(fs.readFileSync(dest))!==m.to_sha256)throw Error('Yeni dosya doğrulaması hatası.');
}catch(e){
 try{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}catch{}
 if(copied)try{fs.copyFileSync(backupFile,dest);}catch(rollback){fail('Geri alınamadı, yedek: '+backupFile+'; '+rollback.message);}
 fail('Değişiklikler geri alındı: '+e.message);
}
console.log('✓ '+m.target);
console.log('\n✅ G3.9.2 KURULDU — 300 KM/SA + DAHA ETKİLİ VİRAJ KONTROLÜ');
console.log('Bayraklar, pist, kokpit, AI ve şampiyona korundu.');
console.log('Yedek: '+backup);
console.log('Test: npm.cmd run build -- --webpack');
