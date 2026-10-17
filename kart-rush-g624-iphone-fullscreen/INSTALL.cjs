#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=process.cwd();
const die=s=>{console.error('[HATA] G6.2.4: '+s);process.exit(1);};
if(!fs.existsSync(path.join(base,'package.json')))die('F1 Medipol proje ana klasorunden calistir.');
const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
let pkg;try{pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));}catch{die('package.json okunamadi.');}
if(!pkg.dependencies?.next&&!pkg.devDependencies?.next)die('Next.js projesi bulunamadi.');
const sha=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const files=Object.values(meta.files).map(f=>{
 const dest=path.resolve(base,f.target),payload=path.join(__dirname,'payload',f.payload);
 if(!dest.startsWith(base+path.sep)||!fs.existsSync(dest)||!fs.existsSync(payload))die('Gerekli kaynak veya payload yok: '+f.target);
 const before=fs.readFileSync(dest,'utf8'),after=fs.readFileSync(payload,'utf8');
 if(sha(after)!==f.newSha)die('Paket hash dogrulama basarisiz: '+f.payload);
 return {...f,dest,before,after,currentSha:sha(before)};
});
if(files.every(f=>f.currentSha===f.newSha)){console.log('[OK] G6.2.4 zaten kurulu; degisiklik yapilmadi.');process.exit(0);}
if(files.some(f=>f.currentSha===f.newSha))die('Kismi/uyumsuz kurulum bulundu. Hicbir dosya degistirilmedi.');
for(const f of files)if(f.currentSha!==f.originalSha)die('G6.2.3 temel dosyasi uyusmuyor: '+f.target+'\nBeklenen SHA: '+f.originalSha+'\nBulunan SHA: '+f.currentSha+'\nMevcut dosyalar korunuyor.');
const backupRoot=path.join(base,'.kart-rush-backups');fs.mkdirSync(backupRoot,{recursive:true});
const backup=fs.mkdtempSync(path.join(backupRoot,'g624-iphone-full-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
try{
 for(const f of files){const saved=path.join(backup,path.relative(base,f.dest));fs.mkdirSync(path.dirname(saved),{recursive:true});fs.copyFileSync(f.dest,saved);if(sha(fs.readFileSync(saved,'utf8'))!==f.originalSha)throw Error('Yedek dogrulama hatasi: '+f.target);}
 fs.writeFileSync(path.join(backup,'index.json'),JSON.stringify({version:meta.version,files:files.map(f=>({target:f.target,originalSha:f.originalSha,newSha:f.newSha}))},null,2));
}catch(e){die('Yedekleme hatasi: '+e.message);}
const written=[];
try{
 for(const f of files){const eol=f.before.includes('\r\n')?'\r\n':'\n',tmp=f.dest+'.g624-temp';
  try{fs.writeFileSync(tmp,f.after.replace(/\n/g,eol),'utf8');if(sha(fs.readFileSync(tmp,'utf8'))!==f.newSha)throw Error('Yazma hash uyusmazligi');fs.renameSync(tmp,f.dest);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}written.push(f);
 }
}catch(e){for(const f of written){try{fs.copyFileSync(path.join(backup,f.target),f.dest);}catch{}}
 die('Guncelleme hatasi, yazilan dosyalar eski haline getirildi: '+e.message);}
console.log('[OK] G6.2.4 iPhone Landscape + 4 Kare HUD kuruldu.');
console.log('Degisen: KartRushTrack.tsx ve kartRush.module.css');
console.log('Yedek: '+backup);
console.log('SIMDI: npm.cmd run build -- --webpack');
