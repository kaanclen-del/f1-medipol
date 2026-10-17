#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const fail=(m)=>{console.error('\n❌ GERİ ALMA DURDU: '+m);process.exit(1);};
const backups=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backups))fail('Yedek klasörü bulunamadı.');
const dirs=fs.readdirSync(backups,{withFileTypes:true}).filter(d=>d.isDirectory()&&d.name.startsWith('g38-sky-steer-crowd-')).sort((a,b)=>a.name<b.name?1:-1);
if(!dirs.length)fail('G38 için yedek bulunamadı.');
const chosen=path.join(backups,dirs[0].name);
const manifest=JSON.parse(fs.readFileSync(path.join(chosen,'manifest.json'),'utf8'));
for(const file of manifest.files){
  const src=path.join(chosen,file.path);
  const dst=path.join(root,file.path);
  if(!fs.existsSync(src))continue;
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.copyFileSync(src,dst);
  console.log('✓ geri yüklendi: '+file.path);
}
console.log('✅ G38 geri alındı.');
console.log('Kaynak yedek: '+chosen);
