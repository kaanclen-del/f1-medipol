#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const m=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const digest=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const fail=(s)=>{console.error('\nGERI ALMA DURDU: '+s);process.exit(1);};
const base=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(base))fail('Yedek klasoru bulunamadi.');
const entries=fs.readdirSync(base).filter(n=>n.startsWith('g401-lighting-')).sort().reverse();
if(!entries.length)fail('G40.1 yedegi bulunamadi.');
const chosen=path.join(base,entries[0]);
const src=path.join(chosen,m.target),dst=path.join(root,m.target);
if(!fs.existsSync(src)||digest(fs.readFileSync(src))!==m.fromSha)fail('Yedek dogrulamasi basarisiz.');
if(!fs.existsSync(dst))fail('Hedef motor dosyasi yok.');
const current=digest(fs.readFileSync(dst));
if(current===m.fromSha){console.log('G40 zaten yuklu.');process.exit(0);}
if(current!==m.toSha)fail('Mevcut motor G40.1 ile eslesmiyor; degisiklik yapilmadi: '+current);
fs.copyFileSync(src,dst);
if(digest(fs.readFileSync(dst))!==m.fromSha)fail('Geri yazim dogrulanamadi.');
console.log('G40.1 geri alindi:',m.target);
console.log('Yedek:',chosen);
