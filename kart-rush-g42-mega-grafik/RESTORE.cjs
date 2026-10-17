#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const sha=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
const fail=(message)=>{console.error('\n[ERROR] G4.2.0 GERI ALMA: '+message);process.exit(1);};
const backups=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backups))fail('Yedek klasoru bulunamadi.');
const dirs=fs.readdirSync(backups).filter(d=>d.startsWith('g420-mega-grafik-')).sort();
if(!dirs.length)fail('G4.2.0 yedegi yok.');
const backup=path.join(backups,dirs[dirs.length-1]);
const index=JSON.parse(fs.readFileSync(path.join(backup,'restore-index.json'),'utf8'));
// First validate all current files so unrelated user edits are never overwritten.
for(const f of index.files){
 const dest=path.join(root,f.path);
 if(!fs.existsSync(dest)||sha(fs.readFileSync(dest))!==f.newSha)
  fail('G4.2.0 sonrasinda degistirilmis dosya bulundu, guvenlik icin geri alma durduruldu: '+f.path);
 if(!f.created){const source=path.join(backup,f.path);if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==f.oldSha)fail('Yedek bozuk: '+f.path);}
}
for(const f of index.files){
 const dest=path.join(root,f.path);
 if(f.created){fs.unlinkSync(dest);console.log('  - '+f.path);}
 else{fs.copyFileSync(path.join(backup,f.path),dest);console.log('  < '+f.path);}
}
console.log('\n[OK] G4.2.0 geri alindi, onceki engine ve dosyalar geri yuklendi.');
