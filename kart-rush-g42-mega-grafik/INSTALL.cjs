#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const sha=(buffer)=>crypto.createHash('sha256').update(buffer).digest('hex');
const fail=(message)=>{console.error('\n[ERROR] G4.2.0: '+message);process.exit(1);};
const currentSha=(file)=>fs.existsSync(file)?sha(fs.readFileSync(file)):null;
if(!fs.existsSync(path.join(root,'package.json')))fail('Ilk once F1 Medipol proje klasorune gec.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch(e){fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const files=manifest.files.map(f=>{
 const source=path.join(__dirname,f.payload),dest=path.join(root,f.path);
 if(!fs.existsSync(source)||currentSha(source)!==f.to_sha256)fail('ZIP bozuk/eksik: '+f.payload);
 const actual=currentSha(dest);
 if(actual!==f.to_sha256 && !(actual===null&&f.allow_missing) && !f.from_sha256.includes(actual))
  fail('Uyumsuz/degistirilmis dosya: '+f.path+'\nBulunan SHA: '+actual+'\nG4.1.0 motor surumu bekleniyor. Hicbir dosyaya dokunulmadi.');
 return {...f,source,dest,actual,needed:actual!==f.to_sha256};
});
const pending=files.filter(f=>f.needed);
if(!pending.length){console.log('[OK] G4.2.0 Mega Grafik Paketi zaten kurulu.');process.exit(0);}
const backup=path.join(root,'.kart-rush-backups','g420-mega-grafik-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const f of pending)if(f.actual!==null){
  const dest=path.join(backup,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f.dest,dest);
 }
 const index={files:pending.map(f=>({path:f.path,oldSha:f.actual,newSha:f.to_sha256,created:f.actual===null}))};
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify(index,null,2),'utf8');
}catch(e){fail('Yedek olusturulamadi: '+e.message);}
const changed=[];
try{
 for(const f of pending){
  fs.mkdirSync(path.dirname(f.dest),{recursive:true});
  const temp=f.dest+'.g420-copy';
  fs.copyFileSync(f.source,temp);
  if(currentSha(temp)!==f.to_sha256)throw Error('Gecici dosya hasarli: '+f.path);
  fs.renameSync(temp,f.dest);
  changed.push(f);
  if(currentSha(f.dest)!==f.to_sha256)throw Error('Kurulum dogrulamasi basarisiz: '+f.path);
  console.log('  + '+f.path+' ('+(f.bytes/1024/1024).toFixed(2)+' MiB)');
 }
}catch(e){
 for(const f of changed.reverse())try{
  if(f.actual===null)fs.unlinkSync(f.dest);
  else fs.copyFileSync(path.join(backup,f.path),f.dest);
 }catch(err){console.error('Restore failed:',f.path,err.message);}
 fail('Degisiklikler geri alinmaya calisildi: '+e.message+'\nYedek: '+backup);
}
console.log('\n[OK] G4.2.0 Mega Grafik Paketi kuruldu.');
console.log('Yeni 4K albedo + 4K normal/roughness atlaslari ve detayli sahne etkin.');
console.log('Kuru havada projektorler kapali, yagmurda koyu asfalt ve kontrollu yansima korunur.');
console.log('Yedek: '+backup);
console.log('Sonraki adim: npm.cmd run build -- --webpack');
