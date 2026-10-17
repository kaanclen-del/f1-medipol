#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(message)=>{console.error('\n[ERROR] G4.2.4 KURULUM DURDU: '+message);process.exit(1);};
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
if(oldSha===manifest.targetSha){console.log('[OK] G4.2.4 zaten kurulu; dosyalar degistirilmedi.');process.exit(0);}
if(oldSha!==manifest.sourceSha)fail('Motor surumu uyusmuyor!\nBulunan SHA: '+oldSha+'\nBeklenen G4.2.3 SHA: '+manifest.sourceSha+'\nOnce G4.2.3 kurulu olmali. Hicbir dosyaya dokunulmadi.');
const backup=path.join(root,'.kart-rush-backups','g424-ai-race-balance-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backedUp=path.join(backup,manifest.target);
try{
 fs.mkdirSync(path.dirname(backedUp),{recursive:true});
 fs.copyFileSync(target,backedUp);
 if(sha(fs.readFileSync(backedUp))!==oldSha)throw Error('Yedekleme dogrulanamadi');
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify({target:manifest.target,originalSha:oldSha,installedSha:manifest.targetSha},null,2));
}catch(e){fail('Yedek olusturulamadi; motor degismedi. '+e.message);}
const tmp=target+'.g424-tmp';
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
console.log('\n[OK] Kart Rush G4.2.4 AI Race Balance uygulandi.');
console.log('Kolay buyuk olcude ayni, normal ve zor botlar daha guclu viraj temposunda.');
console.log('Butun botlarda normal 350 / turbo 370 km/sa ust hizi.');
console.log('Kokpit, grafikler, kullanici surus fizigi degismedi.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
