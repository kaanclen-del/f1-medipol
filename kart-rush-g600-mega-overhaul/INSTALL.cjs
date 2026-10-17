#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const pkg = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(pkg,'manifest.json'),'utf8'));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const fail = message => {console.error('\n[ERROR] GRAPHICS 6.0 KURULUM DURDU: '+message);process.exit(1);};
const canonicalSha = data => sha(Buffer.from(data.toString('utf8').replace(/\r\n/g,'\n')));
if(!fs.existsSync(path.join(root,'package.json')))fail('F1 Medipol proje kokunde calistir.');
const project = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const enginePath=path.join(root,manifest.enginePath);
if(!fs.existsSync(enginePath))fail('Oyun motoru bulunamadi: '+manifest.enginePath);
const existing = fs.readFileSync(enginePath);
const installedEngineSha = manifest.files[0].sha256;
if(sha(existing)===installedEngineSha || canonicalSha(existing)===installedEngineSha){
 const allOK=manifest.files.every(file=>{
  const fp=path.join(root,file.path);
  return fs.existsSync(fp)&&sha(fs.readFileSync(fp))===file.sha256;
 });
 if(allOK){console.log('[OK] G6.0 zaten kurulu. Hicbir dosyaya dokunulmadi.');process.exit(0);}
 fail('Motor G6.0 gorunuyor ama doku dosyalari eksik/farkli. Otomatik ustune yazilmadi.');
}
if(canonicalSha(existing)!==manifest.engineSourceSha256)fail(
 'Bu paket sadece G5.1 Overdrive motoru ile uyumlu.\n'+
 'Mevcut motor SHA256 (Windows LF-normalize): '+canonicalSha(existing)+'\n'+
 'Beklenen G5.1 SHA256: '+manifest.engineSourceSha256+'\n'+
 'Hicbir dosyaya dokunulmadi. Son calisan surumu koruyoruz.');
// Preflight: verify all packaged bytes and ensure no unrelated named asset will be overwritten.
for(const item of manifest.files){
 const from=path.join(pkg,item.payload);
 if(!fs.existsSync(from)||sha(fs.readFileSync(from))!==item.sha256)fail('Bozuk veya eksik paket: '+item.payload);
 const to=path.join(root,item.path);
 if(item.path!==manifest.enginePath&&fs.existsSync(to)&&sha(fs.readFileSync(to))!==item.sha256){
  fail('Yeni doku yolu zaten baska bir dosya iceriyor, ustune yazilmadi: '+item.path);
 }
}
const backupRoot=path.join(root,'.kart-rush-backups');
const backup=path.join(backupRoot,'g600-mega-overhaul-'+new Date().toISOString().replace(/[:.]/g,'-'));
const index={version:manifest.version,createdAt:new Date().toISOString(),files:[]};
try{
 for(const item of manifest.files){
  const fp=path.join(root,item.path),existed=fs.existsSync(fp);
  index.files.push({path:item.path,existed,originalSha:existed?sha(fs.readFileSync(fp)):null,installedSha:item.sha256});
  if(existed){
   const copy=path.join(backup,'files',item.path);
   fs.mkdirSync(path.dirname(copy),{recursive:true});fs.copyFileSync(fp,copy);
   if(sha(fs.readFileSync(copy))!==sha(fs.readFileSync(fp)))throw Error('Yedek checksum hatasi: '+item.path);
  }
 }
 fs.mkdirSync(backup,{recursive:true});
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify(index,null,2));
}catch(e){fail('Yedek olusturulamadi. Hicbir oyun dosyasi degistirilmedi: '+e.message);}
const completed=[];
try{
 for(const item of manifest.files){
  const to=path.join(root,item.path),from=path.join(pkg,item.payload);
  fs.mkdirSync(path.dirname(to),{recursive:true});
  const tmp=to+'.g600-install-tmp';
  try{fs.copyFileSync(from,tmp);if(sha(fs.readFileSync(tmp))!==item.sha256)throw Error('Gecici checksum hatasi');
   fs.renameSync(tmp,to);
  }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  completed.push(item.path);
 }
}catch(e){
 for(const file of [...completed].reverse()){
  const meta=index.files.find(x=>x.path===file),dest=path.join(root,file);
  try{if(meta.existed)fs.copyFileSync(path.join(backup,'files',file),dest);else fs.unlinkSync(dest);}catch(err){console.error('Geri alma sorunu:',file,err.message);}
 }
 fail('Kurulum basarisiz, eski surume otomatik donulmeye calisildi: '+e.message);
}
console.log('[OK] F1 MEDIPOL — Kart Rush GRAPHICS 6.0 MEGA OVERHAUL kuruldu.');
console.log(' + 4K yeni asfalt ve normal/roughness atlaslari');
console.log(' + F1 arac boyasinda clear-coat material ve aerodinamik detaylar');
console.log(' + yeni paddock/marshal/media yapilari, golgeli gokyuzu katmanlari');
console.log(' + bagimsiz sinematik hiz ve vignette GPU pas');
console.log('Yedek:',backup);
console.log('Siradaki komut: npm.cmd run build -- --webpack');
