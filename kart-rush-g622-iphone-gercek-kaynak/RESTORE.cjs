#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),back=path.join(root,'.kart-rush-backups');
const fail=s=>{console.error('[HATA] G6.2.2 GERI AL: '+s);process.exit(1);};
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n'),'utf8').digest('hex');
if(!fs.existsSync(back))fail('Yedek klasoru yok.');
const dirs=fs.readdirSync(back).filter(x=>x.startsWith('g622-iphone-exact-')).sort();
if(!dirs.length)fail('G6.2.2 yedegi bulunamadi.');
const dir=path.join(back,dirs[dirs.length-1]);
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'restore-index.json'),'utf8'));
for(const f of manifest.files){
 const dst=path.join(root,f.rel),src=path.join(dir,f.rel);
 if(!fs.existsSync(dst)||!fs.existsSync(src))fail('Eksik dosya: '+f.rel);
 if(sha(fs.readFileSync(dst,'utf8'))!==f.newSha)fail('Guncellemeden sonra dosya degismis; korunuyor: '+f.rel);
 if(sha(fs.readFileSync(src,'utf8'))!==f.originalSha)fail('Yedek hasari: '+f.rel);
}
for(const f of manifest.files){fs.copyFileSync(path.join(dir,f.rel),path.join(root,f.rel));console.log('  geri alindi: '+f.rel);}
console.log('[OK] G6.1 kaynak kodlari birebir geri yuklendi.');
