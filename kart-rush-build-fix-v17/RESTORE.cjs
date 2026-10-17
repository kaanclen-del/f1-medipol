'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=process.cwd();const backups=path.join(root,'.kart-rush-backups');
const fail=s=>{console.error('❌ '+s);process.exit(1)};
if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(backups))fail('Proje ana klasörünü ve yedekleri kontrol et.');
const names=fs.readdirSync(backups).filter(n=>n.startsWith('build-fix-v17-')).sort();
if(!names.length)fail('Build-fix V17 yedeği yok.');
const folder=path.join(backups,names[names.length-1]);
const items=JSON.parse(fs.readFileSync(path.join(folder,'restore.json'),'utf8'));
for(const {target,backup} of items){fs.copyFileSync(path.join(folder,backup),target);console.log('Geri alındı:',target);}
console.log('✅ V17 düzeltmesi geri alındı.');
