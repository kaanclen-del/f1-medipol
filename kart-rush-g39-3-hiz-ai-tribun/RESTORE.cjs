#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=process.cwd(),sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const fail=(s)=>{console.error('❌ G3.9.3 GERİ ALMA DURDU: '+s);process.exit(1);};
const folder=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(folder))fail('Yedek klasörü bulunamadı.');
const backups=fs.readdirSync(folder).filter(n=>n.startsWith('g393-hiz-ai-tribun-')).sort();
if(!backups.length)fail('G3.9.3 yedeği bulunamadı.');
const backup=path.join(folder,backups[backups.length-1]);
const items=JSON.parse(fs.readFileSync(path.join(backup,'restore-index.json'),'utf8')).files;
for(const item of items){
 const orig=path.join(backup,item.path),target=path.join(root,item.path);
 if(!fs.existsSync(orig)||sha(fs.readFileSync(orig))!==item.oldSha)fail('Yedek eksik veya hasarlı: '+item.path);
 if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==item.newSha)fail('Dosya G3.9.3 sonrasında değişmiş; güvenlik için üzerine yazılmadı: '+item.path);
}
for(const item of items){
 fs.copyFileSync(path.join(backup,item.path),path.join(root,item.path));
 console.log('↩ '+item.path);
}
console.log('✅ G3.9.3 geri alındı.');
