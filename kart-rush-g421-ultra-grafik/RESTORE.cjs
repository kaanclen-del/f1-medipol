#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const fail=(msg)=>{console.error('[ERROR] RESTORE: '+msg);process.exit(1);};
const backups=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backups))fail('Yedek klasoru bulunamadi.');
const dirs=fs.readdirSync(backups).filter(d=>d.startsWith('g421-ultra-grafik-')).sort();
if(!dirs.length)fail('G4.2.1 icin geri alinacak yedek bulunamadi.');
const latest=path.join(backups,dirs[dirs.length-1]);
const idxFile=path.join(latest,'restore-index.json');
if(!fs.existsSync(idxFile))fail('restore-index.json yok: '+latest);
const idx=JSON.parse(fs.readFileSync(idxFile,'utf8'));
for(const f of idx.files){
 const src=path.join(latest,f.path),dest=path.join(root,f.path);
 if(fs.existsSync(src)){
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(src,dest);
  console.log('  restored '+f.path);
 }
}
console.log('[OK] G4.2.1 geri alindi. Kaynak: '+latest);
