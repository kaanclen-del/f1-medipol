#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const manifest = require('./manifest.json');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const normalized = buf => buf.toString('utf8').replace(/\r\n/g,'\n');
const normSha = buf => sha(Buffer.from(normalized(buf),'utf8'));
const fail = message => {console.error('\n[HATA] GO-KART V7.1 KURULUM DURDU: '+message);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('F1 Medipol proje kokunde calistir.');
let project;try{project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))}catch{fail('package.json okunamadi.')}
if(!project.dependencies?.next&&!project.devDependencies?.next)fail('Next.js projesi dogrulanamadi.');
const tsx=path.join(root,manifest.tsx),css=path.join(root,manifest.css);
const payload=path.join(__dirname,'payload','TimingClient.payload.txt');
const addon=path.join(__dirname,'payload','css-addendum.txt');
for(const f of [tsx,css,payload,addon])if(!fs.existsSync(f))fail('Dosya bulunamadi: '+f);
const newTsx=fs.readFileSync(payload),cssAdd=fs.readFileSync(addon);
if(normSha(newTsx)!==manifest.newNormalizedSha || sha(cssAdd)!==manifest.cssAddonSha)fail('Paket bozuk veya eksik; hicbir dosyaya dokunulmadi.');
const beforeTsx=fs.readFileSync(tsx),beforeCss=fs.readFileSync(css);
const beforeNormalized=normSha(beforeTsx);
const already=beforeNormalized===manifest.newNormalizedSha;
const hasCssMarker=beforeCss.toString('utf8').includes(manifest.marker);
if(already&&hasCssMarker){console.log('[OK] V7.1 zaten kurulu, dosyalar degistirilmedi.');process.exit(0)}
if(!already&&beforeNormalized!==manifest.expectedNormalizedSha)fail('Kaynak TimingClient.tsx beklenen V6/V6.1 koduyla eslesmiyor; mevcut dosya korunuyor.\nBulunan SHA256: '+sha(beforeTsx));
const originalCss=beforeCss.toString('utf8');
if(!originalCss.includes('.clockSurface')||!originalCss.includes('.driverRow'))fail('timing.module.css icinde beklenen Go-Kart siniflari yok.');
const newline=beforeTsx.includes(Buffer.from('\r\n'))?'\r\n':'\n';
const patchedTsx=Buffer.from(normalized(newTsx).replace(/\n/g,newline),'utf8');
const cssNewline=beforeCss.includes(Buffer.from('\r\n'))?'\r\n':'\n';
const patchedCss=hasCssMarker?beforeCss:Buffer.from(originalCss.trimEnd()+cssNewline+cssNewline+normalized(cssAdd).replace(/\n/g,cssNewline),'utf8');
const backupDir=path.join(root,'.gokart-backups','multi-lap-v71-'+new Date().toISOString().replace(/[:.]/g,'-'));
const index={tsx:manifest.tsx,css:manifest.css,originalTsxSha:sha(beforeTsx),originalCssSha:sha(beforeCss),installedTsxSha:sha(patchedTsx),installedCssSha:sha(patchedCss)};
const backupTsx=path.join(backupDir,'TimingClient.tsx'),backupCss=path.join(backupDir,'timing.module.css');
try{
 fs.mkdirSync(backupDir,{recursive:true});
 fs.writeFileSync(backupTsx,beforeTsx);fs.writeFileSync(backupCss,beforeCss);
 if(sha(fs.readFileSync(backupTsx))!==index.originalTsxSha || sha(fs.readFileSync(backupCss))!==index.originalCssSha)throw Error('Yedek checksum hatasi');
 fs.writeFileSync(path.join(backupDir,'restore-index.json'),JSON.stringify(index,null,2));
}catch(e){fail('Yedekleme basarisiz, asil dosyalar korunuyor: '+e.message)}
const tmpTsx=tsx+'.v71-tmp',tmpCss=css+'.v71-tmp';
try{
 fs.writeFileSync(tmpTsx,patchedTsx);fs.writeFileSync(tmpCss,patchedCss);
 if(sha(fs.readFileSync(tmpTsx))!==index.installedTsxSha||sha(fs.readFileSync(tmpCss))!==index.installedCssSha)throw Error('Gecici dosya checksum hatasi');
 fs.renameSync(tmpTsx,tsx);fs.renameSync(tmpCss,css);
 if(sha(fs.readFileSync(tsx))!==index.installedTsxSha||sha(fs.readFileSync(css))!==index.installedCssSha)throw Error('Kurulum checksum hatasi');
}catch(e){
 try{if(fs.existsSync(tmpTsx))fs.unlinkSync(tmpTsx);if(fs.existsSync(tmpCss))fs.unlinkSync(tmpCss);fs.copyFileSync(backupTsx,tsx);fs.copyFileSync(backupCss,css)}catch(err){console.error('Elle geri yukleme konumu:',backupDir,err.message)}
 fail('Yazma hatasi: '+e.message);
}
console.log('\n[OK] GO-KART V7.1 WINDOWS UYUMLU ESZAMANLI TUR KAYDI KURULDU.');
console.log('Tum suruculer eszamanli; her surucunun tur basi ayri tutulur.');
console.log('Windows CRLF/LF uyumu var; paket payload .txt oldugu icin Next.js derlemesine karismaz.');
console.log('Yedek:',backupDir);
console.log('Simdi: npm.cmd run build -- --webpack');
