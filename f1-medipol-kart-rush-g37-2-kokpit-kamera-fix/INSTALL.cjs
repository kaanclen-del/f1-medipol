#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(m)=>{console.error('\n❌ KURULUM DURDU: '+m);process.exit(1);};
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Terminali F1 Medipol proje klasöründe açmalısın.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const target=path.join(root,manifest.target);
const payload=path.join(__dirname,'payload',manifest.payload);
if(!fs.existsSync(target))fail('Hedef dosya bulunamadı: '+manifest.target);
if(!fs.existsSync(payload))fail('Paket eksik: '+manifest.payload);
const payloadSha=sha(fs.readFileSync(payload));
if(payloadSha!==manifest.toSha)fail('Paket doğrulaması başarısız. ZIP dosyasını yeniden aç.');
const currentSha=sha(fs.readFileSync(target));
if(currentSha===manifest.toSha){console.log('✅ G37.2 kokpit kamera fix zaten kurulu.');process.exit(0);}
if(currentSha!==manifest.fromSha){
 fail('Uyumsuz kaynak sürümü: '+manifest.target+'\nBeklenen SHA: '+manifest.fromSha+'\nBulunan SHA: '+currentSha+'\nÖnce G37.1 kokpit iyileştirme kurulmuş olmalı.');
}
const backup=path.join(root,'.kart-rush-backups','g37-2-cockpit-fix-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backupTarget=path.join(backup,manifest.target);
fs.mkdirSync(path.dirname(backupTarget),{recursive:true});
fs.copyFileSync(target,backupTarget);
fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
const temp=target+'.g372tmp';
try{
 fs.copyFileSync(payload,temp);
 if(sha(fs.readFileSync(temp))!==manifest.toSha)throw new Error('Geçici dosya doğrulanamadı.');
 fs.renameSync(temp,target);
 if(sha(fs.readFileSync(target))!==manifest.toSha)throw new Error('Yazılan dosya doğrulanamadı.');
}catch(err){
 try{if(fs.existsSync(temp))fs.unlinkSync(temp);}catch{}
 try{fs.copyFileSync(backupTarget,target);}catch{}
 fail('Değişiklik geri alındı: '+err.message);
}
console.log('✓ '+manifest.target);
console.log('\n✅ GRAPHICS 3.7.2 — KOKPİT KAMERA + DİREKSİYON YÖNÜ FIX KURULDU');
console.log('Kokpit kamera artık araca daha sıkı bağlı, direksiyon yönü düzeltildi, iç tasarım güçlendirildi.');
console.log('Yedek: '+backup);
console.log('Sonraki adım: npm.cmd run build -- --webpack');
