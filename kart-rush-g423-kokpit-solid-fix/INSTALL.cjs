#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(message)=>{console.error('\n[ERROR] G4.2.3 KURULUM DURDU: '+message);process.exit(1);};
const sha=(buf)=>crypto.createHash('sha256').update(buf).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
if(!fs.existsSync(path.join(root,'package.json')))fail('F1 Medipol proje kokunde calistir.');
let project;
try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch(e){fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const target=path.join(root,manifest.target);
const source=path.join(__dirname,manifest.payload);
if(!fs.existsSync(target))fail('Motor dosyasi yok: '+manifest.target);
if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==manifest.toSha)fail('ZIP payload bozuk/eksik. Dosyalara dokunulmadi.');
const oldSha=sha(fs.readFileSync(target));
if(oldSha===manifest.toSha){console.log('[OK] G4.2.3 zaten kurulu, dosyalara dokunulmadi.');process.exit(0);}
if(oldSha!==manifest.fromSha)fail('Motor SHA uyusmuyor!\nBulunan: '+oldSha+'\nBeklenen G4.2.2: '+manifest.fromSha+'\nHicbir dosyaya dokunulmadi.');
const backup=path.join(root,'.kart-rush-backups','g423-kokpit-solid-fix-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backedUp=path.join(backup,manifest.target);
try{
 fs.mkdirSync(path.dirname(backedUp),{recursive:true});
 fs.copyFileSync(target,backedUp);
 if(sha(fs.readFileSync(backedUp))!==oldSha)throw Error('Yedekleme dogrulanamadi');
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({target:manifest.target,originalSha:oldSha,installedSha:manifest.toSha},null,2));
}catch(e){fail('Yedek olusturulamadi. Motor dosyasi degismedi. '+e.message);}
const tmp=target+'.g423-tmp';
try{
 fs.copyFileSync(source,tmp);
 if(sha(fs.readFileSync(tmp))!==manifest.toSha)throw Error('Gecici dosya checksum hatasi');
 fs.renameSync(tmp,target);
 if(sha(fs.readFileSync(target))!==manifest.toSha)throw Error('Kurulum checksum hatasi');
}catch(e){
 try{if(fs.existsSync(tmp))fs.unlinkSync(tmp);fs.copyFileSync(backedUp,target);}catch(err){console.error('MANUEL YEDEK:',backedUp,err.message);}
 fail('Kurulum hatasi. Eski surume donulmeye calisildi: '+e.message);
}
console.log('  + '+manifest.target);
console.log('\n[OK] Kart Rush G4.2.3 kokpit onarimi uygulandi.');
console.log('Direksiyonun ici opak, alt panel kapali; uste binen yuzeyler sadeleştirildi.');
console.log('350/370 hiz, AI, ULTRA dokular, hava ve diger kamera modlari korundu.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
