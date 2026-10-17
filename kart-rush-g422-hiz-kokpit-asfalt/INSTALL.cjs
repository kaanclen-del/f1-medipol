#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const sha=(buf)=>crypto.createHash('sha256').update(buf).digest('hex');
const fail=(msg)=>{console.error('\n[ERROR] G4.2.2: '+msg);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('Ilk once F1 Medipol proje klasorune gec.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch(e){fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const backup=path.join(root,'.kart-rush-backups','g422-hiz-kokpit-asfalt-'+new Date().toISOString().replace(/[:.]/g,'-'));
const targetFiles=manifest.files.map(f=>f.path);
fs.mkdirSync(backup,{recursive:true});
for(const rel of targetFiles){
 const dest=path.join(root,rel);
 if(fs.existsSync(dest)){
  const out=path.join(backup,rel);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(dest,out);
 }
}
const restoreIndex={files:targetFiles.filter(rel=>fs.existsSync(path.join(root,rel))).map(rel=>({path:rel}))};
fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify(restoreIndex,null,2),'utf8');
for(const f of manifest.files){
 const src=path.join(__dirname,f.payload);
 const dest=path.join(root,f.path);
 const data=fs.readFileSync(src);
 if(sha(data)!==f.sha256)fail('ZIP bozuk: '+f.payload);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,data);
 console.log('  + '+f.path+' ('+(f.bytes/1024/1024).toFixed(2)+' MiB)');
}
console.log('\n[OK] G4.2.2 hiz / kokpit / asfalt paketi kuruldu.');
console.log('Pistteki beyazlik azaltildi; isiklar korunuyor.');
console.log('Oyuncu + AI top speed: turbosuz ~350 km/s, turboyla ~370 km/s.');
console.log('Kokpit kamera biraz geri cekildi ve daha fazla arac ici gorunur hale geldi.');
console.log('Yedek: '+backup);
console.log('Sonraki adim: npm.cmd run build -- --webpack');
