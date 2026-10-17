#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const sha=(data)=>crypto.createHash('sha256').update(data).digest('hex');
function fail(reason){console.error('❌ GERİ ALINAMADI: '+reason);process.exit(1);}
const base=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(base))fail('Yedek klasörü bulunamadı.');
const dirs=fs.readdirSync(base,{withFileTypes:true}).filter(x=>x.isDirectory()&&x.name.startsWith('g38-1-build-fix-')).map(x=>x.name).sort();
if(!dirs.length)fail('Graphics 3.8.1 yedeği bulunamadı.');
const backup=path.join(base,dirs[dirs.length-1]);
const manifest=JSON.parse(fs.readFileSync(path.join(backup,'manifest.json'),'utf8'));
const target=path.join(root,manifest.target);
const source=path.join(backup,manifest.target);
if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==manifest.before_sha256)fail('Yedek doğrulanamadı.');
if(!fs.existsSync(target))fail('Proje dosyası bulunamadı.');
if(sha(fs.readFileSync(target))!==manifest.after_sha256)fail('G3.8.1 sonrasında dosya değişmiş. Yeni değişiklikleri ezmemek için durduruldu.');
fs.copyFileSync(source,target);
if(sha(fs.readFileSync(target))!==manifest.before_sha256)fail('Geri alma doğrulaması başarısız.');
console.log('✅ G3.8.1 öncesi engine.ts geri yüklendi: '+source);
