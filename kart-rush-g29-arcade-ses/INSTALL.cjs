#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd(),packageDir=__dirname;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{console.error('\n❌ KURULUM DURDU: '+s);process.exit(1);};
if(!fs.existsSync(path.join(root,'package.json')))fail('VS Code terminalini F1 Medipol proje ana klasöründe aç.');
const manifest=JSON.parse(fs.readFileSync(path.join(packageDir,'manifest.json'),'utf8'));
const file=manifest.files[0];
const target=path.join(root,file.dest);
const source=path.join(packageDir,'payload',file.asset);
if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==file.sha)fail('ZIP paketi eksik veya hasarlı.');
if(!fs.existsSync(target))fail('Oyun ses dosyası bulunamadı: '+file.dest);
const actual=sha(fs.readFileSync(target));
if(actual===file.sha){console.log('✅ G2.9 arcade ses zaten yüklü. Dosya değişmedi.');process.exit(0);}
if(!file.allowedOriginalSha.includes(actual))fail('Mevcut sound.ts Graphics 2.8 dosyasıyla eşleşmiyor. Diğer değişiklikleri korumak için kurulmadı.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'.kart-rush-backups','g29-arcade-ses-'+stamp);
try{
 fs.mkdirSync(backup,{recursive:true});
 fs.copyFileSync(target,path.join(backup,'sound.ts'));
 fs.writeFileSync(path.join(backup,'meta.json'),JSON.stringify({dest:file.dest,oldSha:actual,newSha:file.sha},null,2));
 const tmp=target+'.g29-tmp';
 fs.copyFileSync(source,tmp);
 fs.renameSync(tmp,target);
 if(sha(fs.readFileSync(target))!==file.sha)throw Error('Dosya hash doğrulaması başarısız.');
 console.log('✓ '+file.dest);
 console.log('✅ Graphics 2.9 — AKICI ARCADE MOTOR SESİ KURULDU');
 console.log('Eski döngülü V8 ses kaydı kapatıldı; kesintisiz, yumuşak WebAudio yarış motoru aktif.');
 console.log('Yedek: '+backup);
 console.log('Devam: npm.cmd run build -- --webpack');
}catch(e){
 const original=path.join(backup,'sound.ts');
 try{if(fs.existsSync(original))fs.copyFileSync(original,target);}catch{}
 fail('Kurulum tamamlanamadı; önceki ses geri yüklendi: '+e.message);
}
