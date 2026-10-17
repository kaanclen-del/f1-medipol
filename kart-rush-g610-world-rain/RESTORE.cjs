#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),backupRoot=path.join(root,'.kart-rush-backups');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>hash(Buffer.from(x.toString('utf8').replace(/\r\n/g,'\n')));
const fail=x=>{console.error('[HATA] G6.1 GERI ALMA DURDU: '+x);process.exit(1);};
if(!fs.existsSync(backupRoot))fail('Yedek klasoru yok.');
const entries=fs.readdirSync(backupRoot).filter(x=>x.startsWith('g610-world-rain-')).sort();
if(!entries.length)fail('G6.1 yedegi bulunamadi.');
const backup=path.join(backupRoot,entries[entries.length-1]);
const meta=JSON.parse(fs.readFileSync(path.join(backup,'restore-index.json'),'utf8'));
const to=path.join(root,meta.target),from=path.join(backup,meta.target);
if(!fs.existsSync(from)||hash(fs.readFileSync(from))!==meta.oldHash)fail('Yedek dogrulanamadi.');
if(!fs.existsSync(to)||canonical(fs.readFileSync(to))!==meta.newHash)fail('Kurulumdan sonra motor degistirilmis; uzerine yazilmadi.');
const temp=to+'.g610-restore-tmp';
try{fs.copyFileSync(from,temp);fs.renameSync(temp,to);}
catch(e){try{if(fs.existsSync(temp))fs.unlinkSync(temp);}catch{}fail('Geri alma gerceklesmedi: '+e.message);}
console.log('[OK] G6.1 kaldirildi; onceki G6.0 motoru geri yuklendi.');
