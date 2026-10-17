#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=process.cwd();
const root=path.join(base,'.kart-rush-backups');
const die=m=>{console.error('[HATA] G6.2.5 RESTORE: '+m);process.exit(1);};
if(!fs.existsSync(root))die('Yedek klasoru bulunamadi.');
const dirs=fs.readdirSync(root).filter(n=>n.startsWith('g625-hud-cleanup-')).sort().reverse();
if(!dirs.length)die('G6.2.5 yedegi bulunamadi.');
const dir=path.join(root,dirs[0]),meta=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
const hash=t=>crypto.createHash('sha256').update(t.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const rows=meta.files.map(f=>({ ...f,original:path.join(dir,f.target),dest:path.resolve(base,f.target)}));
for(const r of rows){if(!r.dest.startsWith(base+path.sep)||!fs.existsSync(r.original)||!fs.existsSync(r.dest))die('Dosya bulunamadi: '+r.target);
 const current=hash(fs.readFileSync(r.dest,'utf8'));
 if(current!==r.newSha)die('Dosya G6.2.5 sonrasi degistirilmis; uzerine yazilmadi: '+r.target);
 if(hash(fs.readFileSync(r.original,'utf8'))!==r.originalSha)die('Yedek dogrulama hatasi: '+r.target);
}
for(const r of rows)fs.copyFileSync(r.original,r.dest);
console.log('[OK] G6.2.4 dosyasi eski haline getirildi.');
