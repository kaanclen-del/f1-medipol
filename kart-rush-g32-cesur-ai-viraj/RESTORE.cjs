#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(msg)=>{console.error('\n❌ GERİ ALMA DURDU: '+msg);process.exit(1);};
const sha=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Komutu proje ana klasöründe çalıştır.');
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const target=path.join(root,m.target);
const d=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(d))fail('Yedek klasörü bulunamadı.');
const entries=fs.readdirSync(d).filter(x=>x.startsWith('g32-cesur-ai-')).sort().reverse();
if(!entries.length)fail('Graphics 3.2 yedeği bulunamadı.');
const folder=path.join(d,entries[0]);
const backup=path.join(folder,'engine.ts');
if(!fs.existsSync(backup)||sha(fs.readFileSync(backup))!==m.oldSha)fail('Yedek dosyası bozuk veya uyumsuz.');
if(!fs.existsSync(target))fail('Mevcut engine.ts dosyası bulunamadı.');
const liveSha=sha(fs.readFileSync(target));
if(liveSha===m.oldSha){console.log('✅ Önceki sürüm zaten geri yüklenmiş.');process.exit(0);}
if(liveSha!==m.newSha)fail('Motor bu yedekten sonra değiştirilmiş. Üzerine yazılmadı; önce mevcut dosyanı yedekle.');
fs.copyFileSync(backup,target);
console.log('✅ Kart Rush 3.2 geri alındı: '+target);
