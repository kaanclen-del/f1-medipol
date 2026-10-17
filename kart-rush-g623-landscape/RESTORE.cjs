#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=process.cwd();
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const die=s=>{console.error('[HATA] RESTORE: '+s);process.exit(1);};
const dir=path.join(root,'.kart-rush-backups');if(!fs.existsSync(dir))die('Yedek klasoru bulunamadi.');
const candidates=fs.readdirSync(dir).filter(n=>n.startsWith('g623-landscape-')).sort().reverse();if(!candidates.length)die('G6.2.3 yedegi yok.');
const folder=path.join(dir,candidates[0]);const idx=JSON.parse(fs.readFileSync(path.join(folder,'index.json'),'utf8'));
for(const r of idx.files){const target=path.join(root,r.target),saved=path.join(folder,r.target);if(!fs.existsSync(target)||!fs.existsSync(saved)||sha(fs.readFileSync(target,'utf8'))!==r.newSha||sha(fs.readFileSync(saved,'utf8'))!==r.originalSha)die('Dosya degismis veya yedek uyusmuyor: '+r.target+'; hicbir dosya degistirilmedi.');}
for(const r of idx.files)fs.copyFileSync(path.join(folder,r.target),path.join(root,r.target));
console.log('[OK] Onceki G6.2.2 dosyalari geri yuklendi.');
