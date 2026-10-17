#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=process.cwd();
const target=path.join(root,'components','kart-rush','engine.ts');
const payload=path.join(__dirname,'payload','engine.ts');
const sha=(s)=>crypto.createHash('sha256').update(String(s).replace(/\r\n/g,'\n')).digest('hex');
const fail=(msg)=>{console.error('\n❌ KURULUM DURDU: '+msg);process.exit(1);};
if(!fs.existsSync(target)) fail('components/kart-rush/engine.ts bulunamadı. VS Code terminalini proje ana klasöründe aç.');
if(!fs.existsSync(payload)) fail('Paket eksik açılmış. payload/engine.ts bulunamadı.');
const original=fs.readFileSync(target,'utf8');
const next=fs.readFileSync(payload,'utf8');
if(original===next){
 console.log('✅ Graphics 2.1 çevre yükseltmesi zaten kurulu. Hiçbir değişiklik yapılmadı.');
 process.exit(0);
}
if(!original.includes('function buildWorld')||!original.includes('makeSponsorAtlas')||!original.includes('class KartRushEngine')){
 fail('engine.ts beklenen Kart Rush yapısında görünmüyor. Dosya korunarak işlem durduruldu.');
}
const backupDir=path.join(root,'.kart-rush-backups','graphics2-env-v2-1-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(backupDir,{recursive:true});
fs.copyFileSync(target,path.join(backupDir,'engine.ts'));
fs.writeFileSync(path.join(backupDir,'meta.json'),JSON.stringify({createdAt:new Date().toISOString(),sourceSha:sha(original),targetSha:sha(next)},null,2),'utf8');
try{
 fs.writeFileSync(target+'.tmp',next,'utf8');
 fs.renameSync(target+'.tmp',target);
}catch(err){
 try{fs.copyFileSync(path.join(backupDir,'engine.ts'),target);}catch{}
 fail('engine.ts yazılamadı. Yedekten geri yüklendi. '+err.message);
}
console.log('\n✅ Kart Rush Graphics 2.1 — Pist Çevresi + Infield kuruldu.');
console.log('Değişen dosya: components/kart-rush/engine.ts');
console.log('Eklenenler: daha dolu pist çevresi, infield yolları, paddock alanları, grandstand yoğunluğu, merkez ada / apron yerleşimleri, daha az boş ova hissi.');
console.log('Yedek: '+backupDir);
console.log('\nKontrol: npm.cmd run build -- --webpack');
console.log('Sayfa: http://localhost:3000/arcade/kart-rush');
