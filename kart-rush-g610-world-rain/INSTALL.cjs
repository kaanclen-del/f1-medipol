#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(), pkg=__dirname;
const manifest=JSON.parse(fs.readFileSync(path.join(pkg,'manifest.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>hash(Buffer.from(x.toString('utf8').replace(/\r\n/g,'\n')));
const fail=x=>{console.error('\n[HATA] G6.1 3D YAGMUR KURULUMU DURDU: '+x);process.exit(1);};
const packageFile=path.join(root,'package.json');
if(!fs.existsSync(packageFile))fail('F1 Medipol proje kokunde calistir.');
let project;
try{project=JSON.parse(fs.readFileSync(packageFile,'utf8'));}catch{fail('package.json okunamadi.');}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const to=path.join(root,manifest.target),from=path.join(pkg,manifest.payload);
if(!fs.existsSync(to))fail('Motor dosyasi bulunamadi: '+manifest.target);
if(!fs.existsSync(from)||hash(fs.readFileSync(from))!==manifest.targetSha)fail('ZIP dosyasi eksik veya bozuk. Projeye dokunulmadi.');
const current=fs.readFileSync(to),sha=canonical(current);
if(sha===manifest.targetSha){console.log('[OK] G6.1 3D Yagmur zaten yuklu.');process.exit(0);}
if(sha!==manifest.sourceSha)fail('Beklenmeyen motor surumu. G6.0 Mega Overhaul gerekli.\nBulunan SHA256 (CRLF normalize): '+sha+'\nBeklenen: '+manifest.sourceSha+'\nHicbir dosyaya dokunulmadi.');
const backup=path.join(root,'.kart-rush-backups','g610-world-rain-'+new Date().toISOString().replace(/[:.]/g,'-'));
const saved=path.join(backup,manifest.target),indexFile=path.join(backup,'restore-index.json');
try{
 fs.mkdirSync(path.dirname(saved),{recursive:true});
 fs.copyFileSync(to,saved);
 if(hash(fs.readFileSync(saved))!==hash(current))throw Error('Yedek SHA uyusmuyor');
 fs.writeFileSync(indexFile,JSON.stringify({version:manifest.version,target:manifest.target,oldHash:hash(current),newHash:manifest.targetSha},null,2));
}catch(e){fail('Yedek olusturulamadi: '+e.message);}
const temp=to+'.g610-install-tmp';
try{
 fs.copyFileSync(from,temp);
 if(hash(fs.readFileSync(temp))!==manifest.targetSha)throw Error('Gecici dosya dogrulanamadi');
 fs.renameSync(temp,to);
 if(canonical(fs.readFileSync(to))!==manifest.targetSha)throw Error('Yeni motor dogrulanamadi');
}catch(e){
 try{if(fs.existsSync(temp))fs.unlinkSync(temp);fs.copyFileSync(saved,to);}catch(err){console.error('Manuel yedek:',saved,err.message);}
 fail('Kurulum basarisiz; eski motor geri yuklenmeye calisildi: '+e.message);
}
console.log('[OK] KART RUSH GRAPHICS 6.1 — DUNYA YAGMURU KURULDU.');
console.log('  + Ekran ustune sabit yagmur/lens damlasi kaldirildi.');
console.log('  + Kamera etrafinda gercek dunya uzayinda dusen 3D yagmur partikulleri.');
console.log('  + Arac/bina arkasinda depth test, hizla uzayan yagmur cizgileri.');
console.log('  + G6.0 grafikler, fizikler, 4K dokular ve tum diger ekranlar korundu.');
console.log('Yedek:',backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
