#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const digest=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const fail=(s)=>{console.error('\nKURULUM DURDU: '+s);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Projenin kok klasorunde calistir.');
let pkg;try{pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{fail('package.json okunamadi.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)fail('Next.js uygulamasi bulunamadi.');
const target=path.join(root,m.target),payload=path.join(__dirname,m.payload);
if(!fs.existsSync(target))fail('Hedef dosya bulunamadi: '+m.target);
if(!fs.existsSync(payload)||digest(fs.readFileSync(payload))!==m.toSha)fail('ZIP icindeki motor dosyasi eksik veya bozulmus.');
const current=digest(fs.readFileSync(target));
if(current===m.toSha){console.log('G40.2 zaten kurulu. Dosya degistirilmedi.');process.exit(0);}
if(current!==m.fromSha)fail('Beklenen motor Graphics G40.1. Bulunan SHA-256: '+current+'\nDosyalara dokunulmadi.');
const backup=path.join(root,'.kart-rush-backups','g402-stadium-daylight-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backupFile=path.join(backup,m.target);
try{
 fs.mkdirSync(path.dirname(backupFile),{recursive:true});fs.copyFileSync(target,backupFile);
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({target:m.target,old:m.fromSha,new:m.toSha},null,2));
}catch(e){fail('Yedek olusturulamadi: '+e.message);}
const temp=target+'.g402-tmp';
try{
 fs.copyFileSync(payload,temp);
 if(digest(fs.readFileSync(temp))!==m.toSha)throw new Error('Gecici dosya dogrulanamadi.');
 fs.renameSync(temp,target);
 if(digest(fs.readFileSync(target))!==m.toSha)throw new Error('Yazma dogrulamasi basarisiz.');
}catch(e){
 try{if(fs.existsSync(temp))fs.unlinkSync(temp);}catch{}
 try{fs.copyFileSync(backupFile,target);}catch(e2){console.error('YEDEK GERI YUKLENEMEDI:',backupFile,e2.message);}
 fail('Yukleme geri alindi: '+e.message);
}
console.log('G40.2 STADIUM FLOODLIGHT + SUNNY SKY yuklendi.');
console.log('Gunesli kuru pist, kuru havada sis yok; yagmurda kapali gokyuzu + sis ve parlak projektorler.');
console.log('Degisen tek dosya:',m.target);
console.log('Yedek:',backup);
console.log('Simdi calistir: npm.cmd run build -- --webpack');
