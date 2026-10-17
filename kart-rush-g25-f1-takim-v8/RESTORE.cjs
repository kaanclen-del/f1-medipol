#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),dir=path.join(root,'.kart-rush-backups');
function fail(message){console.error('❌ '+message);process.exit(1);}
if(!fs.existsSync(path.join(root,'package.json')))fail('Terminali proje ana klasöründe aç.');
if(!fs.existsSync(dir))fail('Yedek klasörü yok.');
const candidates=fs.readdirSync(dir).filter(n=>n.startsWith('g25-f1-takim-v8-')).sort();
if(!candidates.length)fail('Graphics 2.5 yedeği bulunamadı.');
const latest=path.join(dir,candidates[candidates.length-1]);
const indexFile=path.join(latest,'restore-index.json');
if(!fs.existsSync(indexFile))fail('Yedek indeks dosyası bulunamadı.');
const {files}=JSON.parse(fs.readFileSync(indexFile,'utf8'));
for(const rel of files){if(!fs.existsSync(path.join(latest,rel)))fail('Eksik yedek dosyası: '+rel);}
for(const rel of files){
 fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});
 fs.copyFileSync(path.join(latest,rel),path.join(root,rel));
 console.log('✓ Geri alındı: '+rel);
}
console.log('✅ Graphics 2.5 geri alındı. Yedek: '+latest);
