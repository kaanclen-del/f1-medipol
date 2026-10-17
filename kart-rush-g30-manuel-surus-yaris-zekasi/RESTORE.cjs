#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const die=m=>{console.error('\n❌ GERİ ALMA DURDU: '+m);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))die('VS Code terminalini proje ana klasöründe aç.');
const base=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(base))die('Yedek klasörü bulunamadı.');
const names=fs.readdirSync(base).filter(n=>n.startsWith('g30-manuel-yaris-')).sort();
if(!names.length)die('Graphics 3.0 yedeği bulunamadı.');
const backup=path.join(base,names[names.length-1]);
const index=path.join(backup,'restore-index.json');
if(!fs.existsSync(index))die('Yedek index dosyası yok.');
const records=JSON.parse(fs.readFileSync(index,'utf8')).files;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const entry of records){
 const file=path.join(root,entry.dest),saved=path.join(backup,entry.dest);
 if(!fs.existsSync(saved))die('Yedek eksik: '+entry.dest);
 if(!fs.existsSync(file)||sha(fs.readFileSync(file))!==entry.installedSha)die(entry.dest+' kurulumdan sonra değişmiş. Yeni çalışmaları ezmemek için geri alma durduruldu.');
}
for(const entry of records){
 const file=path.join(root,entry.dest),saved=path.join(backup,entry.dest);
 fs.copyFileSync(saved,file);console.log('✓ Geri yüklendi: '+entry.dest);
}
console.log('\n✅ Graphics 3.0 geri alındı. Kaynak yedek: '+backup);
