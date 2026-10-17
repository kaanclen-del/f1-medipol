'use strict';
const fs=require('node:fs');const path=require('node:path');const root=process.cwd();
const fail=msg=>{console.error('❌ '+msg);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Önce proje ana klasörüne geç.');
const base=path.join(root,'.kart-rush-backups');if(!fs.existsSync(base))fail('Yedek bulunamadı.');
const dirs=fs.readdirSync(base).filter(x=>x.startsWith('v20-1-')).sort();if(!dirs.length)fail('V20.1 yedeği bulunamadı.');
const backup=path.join(base,dirs[dirs.length-1]);
const info=JSON.parse(fs.readFileSync(path.join(backup,'restore.json'),'utf8'));
for(const n of info.files){fs.copyFileSync(path.join(backup,n),path.join(info.dir,n));}
if(info.hadAsset)fs.copyFileSync(path.join(backup,'previous-sponsor-logo.png'),info.asset);
else if(fs.existsSync(info.asset))fs.unlinkSync(info.asset);
console.log('✅ V20.1 öncesi dosyalar geri getirildi. Yedek:',backup);
