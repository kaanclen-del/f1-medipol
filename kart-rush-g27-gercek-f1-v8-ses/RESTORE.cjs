#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function die(msg){console.error('❌ Geri alma iptal: '+msg);process.exit(1);}
const base=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(base))die('Yedek bulunamadı');
const names=fs.readdirSync(base).filter(x=>x.startsWith('g27-gercek-v8-')).sort();
if(!names.length)die('Graphics 2.7 yedeği bulunamadı');
const folder=path.join(base,names[names.length-1]);
const index=JSON.parse(fs.readFileSync(path.join(folder,'restore-index.json'),'utf8'));
for(const f of index.files){
 const current=path.join(root,f.dest);
 if(f.after!==null&&(!fs.existsSync(current)||sha(fs.readFileSync(current))!==f.after))die('Dosya kuruluma göre değişmiş: '+f.dest);
 if(f.existed&&!fs.existsSync(path.join(folder,f.dest)))die('Eksik yedek: '+f.dest);
}
for(const f of index.files){
 const current=path.join(root,f.dest);
 if(f.existed)fs.copyFileSync(path.join(folder,f.dest),current);
 else if(fs.existsSync(current))fs.unlinkSync(current);
 console.log('✓ '+f.dest);
}
console.log('✅ Graphics 2.7 geri alındı. Puan sistemi ve pist kodu değiştirilmedi.');
