#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const projectRoot=process.cwd();
const target=path.join(projectRoot,'components','kart-rush','engine.ts');
const payload=path.join(__dirname,'payload','engine.ts');
const sha=(s)=>crypto.createHash('sha256').update(String(s).replace(/
/g,'
')).digest('hex');
const fail=(msg)=>{console.error('
❌ KURULUM DURDU: '+msg);process.exit(1);};
if(!fs.existsSync(target)) fail('components/kart-rush/engine.ts bulunamadı. Terminali proje ana klasöründe aç.');
if(!fs.existsSync(payload)) fail('Paket eksik açılmış. payload/engine.ts bulunamadı.');
const current=fs.readFileSync(target,'utf8');
const next=fs.readFileSync(payload,'utf8');
if(!current.includes('function buildWorld')||!current.includes('class KartRushEngine')||!current.includes('const FRAG=')) fail('engine.ts beklenen Kart Rush yapısında görünmüyor. Dosya korunarak işlem durduruldu.');
if(current===next){
 console.log('✅ Circuit Venue 2.2 zaten kurulu. Hiçbir değişiklik yapılmadı.');
 process.exit(0);
}
const backup=path.join(projectRoot,'.kart-rush-backups','circuit-venue-v2-2-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(backup,{recursive:true});
fs.copyFileSync(target,path.join(backup,'engine.ts'));
fs.writeFileSync(path.join(backup,'meta.json'),JSON.stringify({createdAt:new Date().toISOString(),fromSha:sha(current),toSha:sha(next)},null,2),'utf8');
try{
 fs.writeFileSync(target+'.tmp',next,'utf8');
 fs.renameSync(target+'.tmp',target);
}catch(err){
 try{fs.copyFileSync(path.join(backup,'engine.ts'),target);}catch{}
 fail('engine.ts yazılamadı. Yedekten geri yüklendi. '+err.message);
}
console.log('
✅ Kart Rush Graphics 2.2 — Circuit Venue Upgrade kuruldu.');
console.log('Değişen dosya: components/kart-rush/engine.ts');
console.log('İyileştirmeler: pist dokusu geri güçlendirildi, çim dokusu iyileştirildi, pit / paddock / grandstand yoğunluğu artırıldı, infield alanları dolduruldu, kamera flaşları eklendi, yakın rakiplerde detaylı araç bütçesi artırıldı.');
console.log('Yedek: '+backup);
console.log('
Sonraki adım: npm.cmd run build -- --webpack');
