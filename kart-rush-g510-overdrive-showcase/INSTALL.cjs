#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(message)=>{console.error('\n[ERROR] G5.1 KURULUM DURDU: '+message);process.exit(1);};
const sha=(buf)=>crypto.createHash('sha256').update(buf).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
if(!fs.existsSync(path.join(root,'package.json')))fail('F1 Medipol proje kokunde calistir.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch(e){fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const target=path.join(root,manifest.target);
const source=path.join(__dirname,manifest.payload);
if(!fs.existsSync(target))fail('Motor dosyasi yok: '+manifest.target);
if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==manifest.targetSha)fail('ZIP payload bozuk/eksik. Dosyalara dokunulmadi.');
const oldSha=sha(fs.readFileSync(target));
if(oldSha===manifest.targetSha){console.log('[OK] G5.1 zaten kurulu; dosyalar degistirilmedi.');process.exit(0);}
if(oldSha!==manifest.sourceSha)fail('Motor surumu uyusmuyor!\nBulunan SHA: '+oldSha+'\nBeklenen G5.0 SHA: '+manifest.sourceSha+'\nOnce G5.0 Cinematic Showcase kurulu olmali. Hicbir dosyaya dokunulmadi.');
const backup=path.join(root,'.kart-rush-backups','g510-overdrive-showcase-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backedUp=path.join(backup,manifest.target);
try{
 fs.mkdirSync(path.dirname(backedUp),{recursive:true});
 fs.copyFileSync(target,backedUp);
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({target:manifest.target,originalSha:oldSha,installedSha:manifest.targetSha},null,2));
}catch(e){fail('Yedek olusturulamadi; motor degismedi. '+e.message);}
const tmp=target+'.g510-tmp';
try{
 fs.copyFileSync(source,tmp);
 if(sha(fs.readFileSync(tmp))!==manifest.targetSha)throw Error('Gecici dosya checksum hatasi');
 fs.renameSync(tmp,target);
 if(sha(fs.readFileSync(target))!==manifest.targetSha)throw Error('Kurulum checksum hatasi');
}catch(e){
 try{if(fs.existsSync(tmp))fs.unlinkSync(tmp);fs.copyFileSync(backedUp,target);}catch(err){console.error('MANUEL YEDEK:',backedUp,err.message);} 
 fail('Kurulum hatasi; eski surume donulmeye calisildi: '+e.message);
}
console.log('  + '+manifest.target);
console.log('\n[OK] Kart Rush G5.1 Overdrive Showcase uygulandi.');
console.log('Tribunler, kalabalik, bayraklar, gokyuzu, aydinlatma ve cevre geometri seviyesi bir kademe daha abartildi.');
console.log('Asfalt tonu daha dogal/koyu hale getirildi; kuru zeminde daha belirgin sinematik sheen var.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
