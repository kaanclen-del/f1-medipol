#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{console.error('\nGERI ALMA DURDU: '+s);process.exit(1);};
const target=path.join(root,m.target);
if(!fs.existsSync(target))fail('Motor dosyasi bulunamadi.');
if(digest(fs.readFileSync(target))!==m.toSha)fail('Motor G40.2 degil; geri alma yapilmadi.');
const backups=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backups))fail('Yedek klasoru bulunamadi.');
const candidates=fs.readdirSync(backups).filter(f=>f.startsWith('g402-stadium-daylight-')).sort().reverse();
if(!candidates.length)fail('G40.2 oncesi yedek bulunamadi.');
let restored=false;
for(const name of candidates){
 const source=path.join(backups,name,m.target);
 if(!fs.existsSync(source)||digest(fs.readFileSync(source))!==m.fromSha)continue;
 const temp=target+'.g402-restore-tmp';
 fs.copyFileSync(source,temp);fs.renameSync(temp,target);
 restored=true;
 console.log('G40.1 motoruna donuldu. Yedek:',name);break;
}
if(!restored)fail('Dogrulanmis yedek bulunamadi.');
