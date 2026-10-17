#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const fail=(message)=>{console.error('\n[ERROR] G4.0.4 GERI ALMA DURDU: '+message);process.exit(1);};
const backupsDir=path.join(root,'.kart-rush-backups');
if(!fs.existsSync(backupsDir))fail('Yedek klasoru bulunamadi.');
const dirs=fs.readdirSync(backupsDir).filter(name=>name.startsWith('g404-wet-asphalt-tone-fix-')).sort();
if(!dirs.length)fail('G4.0.4 icin geri alinacak yedek bulunamadi.');
const latest=path.join(backupsDir,dirs[dirs.length-1]);
const restoreIndex=path.join(latest,'restore-index.json');
if(!fs.existsSync(restoreIndex))fail('restore-index.json bulunamadi: '+latest);
const meta=JSON.parse(fs.readFileSync(restoreIndex,'utf8'));
for(const file of meta.files){
 const src=path.join(latest,file.path),dest=path.join(root,file.path);
 if(!fs.existsSync(src))fail('Yedek dosya eksik: '+src);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(src,dest);
 console.log('↺ '+file.path);
}
console.log('\n[OK] G4.0.4 geri alindi. Kaynak yedek: '+latest);
