#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const manifest=require('./manifest.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const norm=b=>b.toString('utf8').replace(/\r\n/g,'\n');
const normalizedSha=b=>sha(Buffer.from(norm(b),'utf8'));
const fail=m=>{console.error('\n[HATA] GO-KART V7.2 KURULUM DURDU: '+m);process.exit(1)};
if(!fs.existsSync(path.join(root,'package.json')))fail('F1 Medipol proje kokunde calistir.');
let project;try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))}catch{fail('package.json okunamadi')}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const tsx=path.join(root,manifest.tsx),css=path.join(root,manifest.css);
const payload=path.join(__dirname,'payload/TimingClient.payload.txt');
const addon=path.join(__dirname,'payload/css-addendum.txt');
for(const f of [tsx,css,payload,addon])if(!fs.existsSync(f))fail('Dosya bulunamadi: '+f);
const newTsx=fs.readFileSync(payload),newCssAddon=fs.readFileSync(addon);
if(normalizedSha(newTsx)!==manifest.targetNormalizedSha||sha(newCssAddon)!==manifest.cssAddonSha)fail('Paket bozuk veya eksik; mevcut dosyalar korunuyor.');
const beforeTsx=fs.readFileSync(tsx),beforeCss=fs.readFileSync(css);
const srcSha=normalizedSha(beforeTsx);
const oldCssText=norm(beforeCss);
if(srcSha===manifest.targetNormalizedSha&&oldCssText.includes(manifest.newCssMarker)){
 console.log('[OK] Go-Kart V7.2 zaten kurulu; dosyalar degistirilmedi.');process.exit(0);
}
if(srcSha!==manifest.sourceNormalizedSha)fail('TimingClient.tsx beklenen V7.1 surumuyle eslesmiyor. Hicbir dosyaya dokunulmadi.\nBulunan SHA256: '+sha(beforeTsx)+'\nV7.1 kurulu oldugundan emin ol.');
if(!oldCssText.includes(manifest.requiredCssMarker))fail('V7.1 timing.module.css isareti bulunamadi, mevcut CSS dosyasi korunuyor.');
const eolTsx=beforeTsx.includes(Buffer.from('\r\n'))?'\r\n':'\n';
const eolCss=beforeCss.includes(Buffer.from('\r\n'))?'\r\n':'\n';
const nextTsx=Buffer.from(norm(newTsx).replace(/\n/g,eolTsx),'utf8');
const nextCss=Buffer.from(oldCssText.trimEnd().replace(/\n/g,eolCss)+eolCss+norm(newCssAddon).trimStart().replace(/\n/g,eolCss),'utf8');
const backup=path.join(root,'.gokart-backups','ui-v72-'+new Date().toISOString().replace(/[:.]/g,'-'));
const originalTsx=path.join(backup,'TimingClient.tsx'),originalCss=path.join(backup,'timing.module.css');
const meta={tsx:manifest.tsx,css:manifest.css,sourceTsxSha:sha(beforeTsx),sourceCssSha:sha(beforeCss),targetTsxSha:sha(nextTsx),targetCssSha:sha(nextCss)};
try{
 fs.mkdirSync(backup,{recursive:true});
 fs.writeFileSync(originalTsx,beforeTsx);fs.writeFileSync(originalCss,beforeCss);
 if(sha(fs.readFileSync(originalTsx))!==meta.sourceTsxSha||sha(fs.readFileSync(originalCss))!==meta.sourceCssSha)throw Error('Yedek checksum hatasi');
 fs.writeFileSync(path.join(backup,'restore-index.json'),JSON.stringify(meta,null,2));
}catch(e){fail('Yedek alinamadi, eski dosyalar korundu: '+e.message)}
const tempTsx=tsx+'.v72-tmp',tempCss=css+'.v72-tmp';
try{
 fs.writeFileSync(tempTsx,nextTsx);fs.writeFileSync(tempCss,nextCss);
 if(sha(fs.readFileSync(tempTsx))!==meta.targetTsxSha||sha(fs.readFileSync(tempCss))!==meta.targetCssSha)throw Error('Yazilan gecici dosya kontrolu basarisiz');
 fs.renameSync(tempTsx,tsx);fs.renameSync(tempCss,css);
 if(sha(fs.readFileSync(tsx))!==meta.targetTsxSha||sha(fs.readFileSync(css))!==meta.targetCssSha)throw Error('Kurulum dogrulamasi basarisiz');
}catch(e){
 try{if(fs.existsSync(tempTsx))fs.unlinkSync(tempTsx);if(fs.existsSync(tempCss))fs.unlinkSync(tempCss);fs.copyFileSync(originalTsx,tsx);fs.copyFileSync(originalCss,css)}catch(err){console.error('Yedek konumu:',backup,err.message)}
 fail('Kurulum hatasi. Onceki surume donulmeye calisildi: '+e.message);
}
console.log('\n[OK] Go-Kart V7.2 Sade Ekran kuruldu.');
console.log('Arac adi/numarasi kutusu ve Siralama Ayarlari paneli kaldirildi.');
console.log('Arac numarasi otomatik atanir, siralama en hizli tek tura gore yapilir.');
console.log('Eszamanli kronometre, tur kayitlari, cezalar ve mevcut localStorage verileri korunur.');
console.log('Yedek: '+backup);
console.log('Kontrol: npm.cmd run build -- --webpack');
