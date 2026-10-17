#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),backups=path.join(root,'.gokart-backups');
const fail=m=>{console.error('[HATA] '+m);process.exit(1)};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(backups))fail('Hicbir Go-Kart yedegi bulunamadi.');
const names=fs.readdirSync(backups).filter(n=>n.startsWith('multi-lap-v71-')).sort();
if(!names.length)fail('Go-Kart V7.1 yedegi bulunamadi.');
const dir=path.join(backups,names[names.length-1]);
const idx=JSON.parse(fs.readFileSync(path.join(dir,'restore-index.json'),'utf8'));
const tsx=path.join(root,idx.tsx),css=path.join(root,idx.css);
const beforeTsx=path.join(dir,'TimingClient.tsx'),beforeCss=path.join(dir,'timing.module.css');
if(sha(fs.readFileSync(beforeTsx))!==idx.originalTsxSha||sha(fs.readFileSync(beforeCss))!==idx.originalCssSha)fail('Yedek dosyalari degistirilmis.');
if(sha(fs.readFileSync(tsx))!==idx.installedTsxSha||sha(fs.readFileSync(css))!==idx.installedCssSha)fail('Kurulumdan sonra dosyalarda degisiklik var. Otomatik geri alma bunlari silmez.');
fs.copyFileSync(beforeTsx,tsx);fs.copyFileSync(beforeCss,css);
console.log('[OK] Go-Kart V7.1 kaldirildi, onceki iki dosya geri getirildi.');
