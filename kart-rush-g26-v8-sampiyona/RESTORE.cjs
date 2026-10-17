#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=m=>{console.error('\n❌ GERİ ALMA DURDU: '+m);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Proje ana dizininde çalıştır.');
const backupsDir=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backupsDir))fail('Yedek klasörü bulunamadı.');
const candidates=fs.readdirSync(backupsDir).filter(n=>n.startsWith('g26-v8-sampiyona-')).sort();
if(!candidates.length)fail('G2.6 için yedek bulunamadı.');
const b=path.join(backupsDir,candidates[candidates.length-1]);
const records=JSON.parse(fs.readFileSync(path.join(b,'restore-index.json'),'utf8')).files;
for(const item of records){
 const target=path.join(root,item.dest),source=path.join(b,item.dest);
 if(!fs.existsSync(source))fail('Yedek eksik: '+item.dest);
 if(sha(fs.readFileSync(target))!==item.installedSha)fail('Dosya G2.6 sonrası değişmiş; korunuyor: '+item.dest);
}
for(const item of records){const dest=path.join(root,item.dest);fs.copyFileSync(path.join(b,item.dest),dest);console.log('✓ Geri alındı: '+item.dest);}
console.log('\n✅ Grafik/ses/arayüz G2.5 seviyesine geri döndü. SQL verileri değiştirilmedi.');
