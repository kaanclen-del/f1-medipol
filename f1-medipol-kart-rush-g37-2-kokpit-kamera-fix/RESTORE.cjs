#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const fail=(m)=>{console.error('\n❌ GERİ ALMA DURDU: '+m);process.exit(1);};
const backups=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backups))fail('Yedek klasörü bulunamadı.');
const dirs=fs.readdirSync(backups,{withFileTypes:true}).filter(d=>d.isDirectory()&&d.name.startsWith('g37-2-cockpit-fix-')).sort((a,b)=>a.name<b.name?1:-1);
if(!dirs.length)fail('G37.2 için yedek bulunamadı.');
const chosen=path.join(backups,dirs[0].name);
const meta=JSON.parse(fs.readFileSync(path.join(chosen,'manifest.json'),'utf8'));
const src=path.join(chosen,meta.target);
const dst=path.join(root,meta.target);
if(!fs.existsSync(src))fail('Yedek dosya eksik.');
fs.mkdirSync(path.dirname(dst),{recursive:true});
fs.copyFileSync(src,dst);
console.log('✅ Geri yüklendi: '+meta.target);
console.log('Kaynak yedek: '+chosen);
