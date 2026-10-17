#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),base=process.cwd();
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const die=s=>{console.error('[HATA] G6.2.4 RESTORE: '+s);process.exit(1);};
const backups=path.join(base,'.kart-rush-backups');if(!fs.existsSync(backups))die('Yedek klasoru yok.');
const names=fs.readdirSync(backups).filter(n=>n.startsWith('g624-iphone-full-')).sort().reverse();if(!names.length)die('G6.2.4 yedegi bulunamadi.');
const dir=path.join(backups,names[0]);const index=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
for(const f of index.files){const dest=path.join(base,f.target),saved=path.join(dir,f.target);
 if(!fs.existsSync(dest)||!fs.existsSync(saved)||sha(fs.readFileSync(dest,'utf8'))!==f.newSha||sha(fs.readFileSync(saved,'utf8'))!==f.originalSha)die('Dosyalar kurulumdan sonra degistirilmis/yedek gecersiz: '+f.target+'; hicbir sey degistirilmedi.');
}
for(const f of index.files)fs.copyFileSync(path.join(dir,f.target),path.join(base,f.target));
console.log('[OK] G6.2.3 dosyalari geri yuklendi.');
