#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(), dir=path.join(root,'.kart-rush-backups');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const fail=m=>{console.error('[ERROR] G6 RESTORE: '+m);process.exit(1);};
if(!fs.existsSync(dir))fail('Yedek klasoru bulunamadi.');
const hits=fs.readdirSync(dir).filter(n=>n.startsWith('g600-mega-overhaul-')).sort();
if(!hits.length)fail('G6.0 kurulum yedegi bulunamadi.');
const backup=path.join(dir,hits[hits.length-1]);
const idx=JSON.parse(fs.readFileSync(path.join(backup,'restore-index.json'),'utf8'));
// Protect user edits created after this install: no partial restore.
for(const f of idx.files){
 const target=path.join(root,f.path);
 if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==f.installedSha)
  fail('Kurulumdan sonra degistirilmis dosyaya dokunulmadi: '+f.path);
 if(f.existed){const source=path.join(backup,'files',f.path);
  if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==f.originalSha)fail('Yedek bozuk: '+f.path);}
}
for(const f of idx.files){
 const target=path.join(root,f.path);
 if(f.existed)fs.copyFileSync(path.join(backup,'files',f.path),target);
 else fs.unlinkSync(target);
 console.log(' restored '+f.path);
}
console.log('[OK] G5.1 motoru ve onceki dosyalar geri yuklendi.');
