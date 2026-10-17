#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),backups=path.join(root,'.gokart-backups');
const fail=m=>{console.error('[HATA] GO-KART V7.2 RESTORE DURDU: '+m);process.exit(1)};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(backups))fail('Yedek klasoru bulunamadi.');
const names=fs.readdirSync(backups).filter(n=>n.startsWith('ui-v72-')).sort();
if(!names.length)fail('V7.2 yedegi bulunamadi.');
const dir=path.join(backups,names[names.length-1]);
const meta=JSON.parse(fs.readFileSync(path.join(dir,'restore-index.json'),'utf8'));
const tsx=path.join(root,meta.tsx),css=path.join(root,meta.css);
const oldTsx=path.join(dir,'TimingClient.tsx'),oldCss=path.join(dir,'timing.module.css');
for(const f of [tsx,css,oldTsx,oldCss])if(!fs.existsSync(f))fail('Dosya bulunamadi: '+f);
if(sha(fs.readFileSync(oldTsx))!==meta.sourceTsxSha||sha(fs.readFileSync(oldCss))!==meta.sourceCssSha)fail('Yedek checksum hatali.');
if(sha(fs.readFileSync(tsx))!==meta.targetTsxSha||sha(fs.readFileSync(css))!==meta.targetCssSha)fail('Kurulumdan sonra dosyalar degismis. Geri alinirsa degisiklikler silinebilir, otomatik durduruldu.');
fs.copyFileSync(oldTsx,tsx);fs.copyFileSync(oldCss,css);
console.log('[OK] Go-Kart V7.2 geri alindi, V7.1 geri yüklendi.');
