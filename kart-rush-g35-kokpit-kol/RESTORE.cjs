#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=process.cwd();const backupRoot=path.join(root,'.kart-rush-backups');
const fail=message=>{console.error('\n❌ GERİ ALMA DURDU: '+message);process.exit(1);};
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Önce proje kök klasörüne geç.');
if(!fs.existsSync(backupRoot))fail('Yedek klasörü yok.');
const dirs=fs.readdirSync(backupRoot).filter(n=>n.startsWith('g35-kokpit-kol-')).sort();
if(!dirs.length)fail('Graphics 3.5 yedeği yok.');
const backup=path.join(backupRoot,dirs[dirs.length-1]);
const index=JSON.parse(fs.readFileSync(path.join(backup,'restore-index.json'),'utf8'));
// Validate before copying; refuse if files were changed after Graphics 3.5.
for(const file of index.files){
 const target=path.join(root,file.path),source=path.join(backup,file.path);
 if(!fs.existsSync(source))fail('Yedek eksik: '+file.path);
 if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==file.installedSha)fail('Graphics 3.5 sonrası değişiklik var: '+file.path+' — dosya korunuyor.');
}
for(const file of index.files){fs.copyFileSync(path.join(backup,file.path),path.join(root,file.path));console.log('↩ '+file.path);}
console.log('\n✅ Graphics 3.5 geri alındı. Yedek: '+backup);
