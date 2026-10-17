#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=process.cwd();
const fail=m=>{console.error('[HATA] G6.2.5: '+m);process.exit(1);};
if(!fs.existsSync(path.join(base,'package.json')))fail('F1 Medipol proje klasorunde calistir.');
let project;try{project=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));}catch{fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi bulunamadi.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const hash=t=>crypto.createHash('sha256').update(t.replace(/\r\n/g,'\n'),'utf8').digest('hex');
const entries=manifest.files.map(f=>{
 const file=path.resolve(base,f.target),payload=path.join(__dirname,f.payload);
 if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.existsSync(payload))fail('Dosya bulunamadi: '+f.target);
 const current=fs.readFileSync(file,'utf8'),next=fs.readFileSync(payload,'utf8');
 if(hash(next)!==f.newSha)fail('ZIP icerigi dogrulanamadi: '+f.target);
 return {...f,file,current,next,currentSha:hash(current)};
});
if(entries.every(f=>f.currentSha===f.newSha)){console.log('[OK] G6.2.5 zaten kurulu.');process.exit(0);}
if(entries.some(f=>f.currentSha===f.newSha))fail('Kismi kurulum algilandi; dosyalara dokunulmadi.');
for(const f of entries){if(f.currentSha!==f.originalSha)fail('G6.2.4 dosyasi beklenenden farkli: '+f.target+'\nBeklenen: '+f.originalSha+'\nMevcut: '+f.currentSha+'\nOrijinal korunuyor.');}
const dir=path.join(base,'.kart-rush-backups');fs.mkdirSync(dir,{recursive:true});
const backup=fs.mkdtempSync(path.join(dir,'g625-hud-cleanup-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
try{
 for(const f of entries){const dest=path.join(backup,f.target);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f.file,dest);if(hash(fs.readFileSync(dest,'utf8'))!==f.originalSha)throw Error('Yedek hash hatasi');}
 fs.writeFileSync(path.join(backup,'index.json'),JSON.stringify({version:manifest.version,files:entries.map(f=>({target:f.target,originalSha:f.originalSha,newSha:f.newSha}))},null,2));
}catch(e){fail('Yedek alinamadi: '+e.message);}
const written=[];
try{
 for(const f of entries){const end=f.current.includes('\r\n')?'\r\n':'\n';const tmp=f.file+'.g625-tmp';
  try{fs.writeFileSync(tmp,f.next.replace(/\n/g,end),'utf8');if(hash(fs.readFileSync(tmp,'utf8'))!==f.newSha)throw Error('Kurulum yazma dogrulamasi');fs.renameSync(tmp,f.file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  written.push(f);
 }
}catch(e){for(const f of written){try{fs.copyFileSync(path.join(backup,f.target),f.file);}catch{}}
 fail('Yazma hatasi; eski dosyalar geri alindi: '+e.message);
}
console.log('[OK] G6.2.5 eski HUD katmanlari kaldirildi.');
console.log('Guncellenen: components/kart-rush/KartRushTrack.tsx');
console.log('Yedek: '+backup);
console.log('SONRAKI: npm.cmd run build -- --webpack');
