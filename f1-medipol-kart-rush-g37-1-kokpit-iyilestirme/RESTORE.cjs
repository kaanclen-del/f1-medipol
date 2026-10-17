#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const dir=process.cwd();
const fail=(s)=>{console.error('\n❌ GERİ ALMA DURDU: '+s);process.exit(1);};
const backupRoot=path.join(dir,'.kart-rush-backups');
if(!fs.existsSync(backupRoot))fail('Yedek klasörü bulunamadı.');
const entries=fs.readdirSync(backupRoot,{withFileTypes:true}).filter(d=>d.isDirectory()&&d.name.startsWith('g37-1-cockpit-')).sort((a,b)=>a.name<b.name?1:-1);
if(!entries.length)fail('G37.1 için geri alınacak yedek bulunamadı.');
const chosen=path.join(backupRoot,entries[0].name);
const meta=JSON.parse(fs.readFileSync(path.join(chosen,'manifest.json'),'utf8'));
const backupTarget=path.join(chosen,meta.target);
const target=path.join(dir,meta.target);
if(!fs.existsSync(backupTarget))fail('Yedek dosya eksik: '+backupTarget);
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.copyFileSync(backupTarget,target);
console.log('✅ Geri yüklendi: '+meta.target);
console.log('Kaynak yedek: '+chosen);
