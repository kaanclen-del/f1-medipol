#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd(),sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const fail=m=>{console.error('❌ GERİ ALMA DURDU: '+m);process.exit(1);};
const folder=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(folder))fail('Yedek klasörü bulunamadı.');
const dirs=fs.readdirSync(folder).filter(d=>d.startsWith('g392-steering-')).sort();
if(!dirs.length)fail('G3.9.2 yedeği bulunamadı.');
const chosen=path.join(folder,dirs[dirs.length-1]);
const m=JSON.parse(fs.readFileSync(path.join(chosen,'manifest.json'),'utf8'));
const source=path.join(chosen,m.target),dest=path.join(root,m.target);
if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==m.installed_from_sha256)fail('Yedek hasarlı veya eksik.');
if(!fs.existsSync(dest)||sha(fs.readFileSync(dest))!==m.to_sha256)fail('engine.ts daha sonra değişmiş; üzerine yazılmadı.');
fs.copyFileSync(source,dest);
console.log('✅ G3.9.2 geri alındı. Önceki sürüm: '+m.installed_from_sha256.slice(0,12));
