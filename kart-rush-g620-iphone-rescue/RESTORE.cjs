#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd();const back=path.join(root,'.kart-rush-backups');
const fail=x=>{console.error('[HATA] G6.2 GERI ALMA: '+x);process.exit(1);};
if(!fs.existsSync(back))fail('Yedekler bulunamadi.');
const dirs=fs.readdirSync(back).filter(x=>x.startsWith('g620-iphone-rescue-')).sort();
if(!dirs.length)fail('G6.2 yedegi bulunamadi.');
const dir=path.join(back,dirs[dirs.length-1]);
const meta=JSON.parse(fs.readFileSync(path.join(dir,'restore-index.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
for(const f of meta.files){
 const dst=path.join(root,f.target),src=path.join(dir,f.target);
 if(!fs.existsSync(src)||!fs.existsSync(dst))fail('Dosya yok: '+f.target);
 if(sha(fs.readFileSync(dst,'utf8'))!==f.newSha)fail('Sonradan degisiklik var: '+f.target+'. Uzerine yazilmadi.');
}
for(const f of meta.files){fs.copyFileSync(path.join(dir,f.target),path.join(root,f.target));console.log('  restored '+f.target);}
console.log('[OK] G6.1 ve onceki UI geri yuklendi.');
