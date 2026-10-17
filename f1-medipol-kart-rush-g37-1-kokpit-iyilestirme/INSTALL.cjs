#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dir=process.cwd();
const fail=(s)=>{console.error('\n❌ KURULUM DURDU: '+s);process.exit(1);};
const digest=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
if(!fs.existsSync(path.join(dir,'package.json')))fail('F1 Medipol proje klasöründe terminal açmalısın.');
const target=path.join(dir,manifest.target);
const payload=path.join(__dirname,'payload',manifest.payload);
if(!fs.existsSync(target))fail('Kart Rush motoru bulunamadı: '+manifest.target);
if(!fs.existsSync(payload))fail('Paket eksik: '+manifest.payload);
if(digest(fs.readFileSync(payload))!==manifest.toSha)fail('Paket doğrulaması başarısız, ZIP dosyasını yeniden indir.');
const currentSha=digest(fs.readFileSync(target));
if(currentSha===manifest.toSha){console.log('✅ Graphics 3.7.1 zaten kurulu, dosya değiştirilmedi.');process.exit(0);}
if(currentSha!==manifest.fromSha)fail('Mevcut engine.ts beklenen Graphics 3.7 sürümüyle eşleşmiyor.\nBulunan SHA-256: '+currentSha+'\nİşlem yapılmadı. Hatalı sürümün üzerine yazmamak için çıktıyı paylaş.');
const backup=path.join(dir,'.kart-rush-backups','g37-1-cockpit-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backupTarget=path.join(backup,manifest.target);
let temporary='';
try{
 fs.mkdirSync(path.dirname(backupTarget),{recursive:true});
 fs.copyFileSync(target,backupTarget);
 fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({target:manifest.target,fromSha:manifest.fromSha,toSha:manifest.toSha},null,2),'utf8');
 temporary=target+'.g37-1-tmp';
 fs.copyFileSync(payload,temporary);
 if(digest(fs.readFileSync(temporary))!==manifest.toSha)throw new Error('Dosya kopyası doğrulanamadı.');
 fs.renameSync(temporary,target);
 if(digest(fs.readFileSync(target))!==manifest.toSha)throw new Error('Yazma doğrulaması başarısız.');
}catch(err){
 try{if(temporary&&fs.existsSync(temporary))fs.unlinkSync(temporary);}catch{}
 try{if(fs.existsSync(backupTarget))fs.copyFileSync(backupTarget,target);}catch{}
 fail('Değişiklik geri alındı: '+err.message);
}
console.log('✓ '+manifest.target);
console.log('\n✅ GRAPHICS 3.7.1 — KOKPİT KAMERA + İÇ TASARIM İYİLEŞTİRMESİ KURULDU');
console.log('Kamera daha içeri alındı, cockpit near-clip düzeltildi, kokpit duvarları/panel/dash güçlendirildi.');
console.log('Yedek: '+backup);
console.log('Sonraki adım: npm.cmd run build -- --webpack');
