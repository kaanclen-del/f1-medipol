#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const sha=(data)=>crypto.createHash('sha256').update(data).digest('hex');
function fail(reason){console.error('\n❌ G3.8.1 KURULUM DURDU: '+reason);process.exit(1);}
if(!fs.existsSync(path.join(root,'package.json')))fail('PowerShell terminalini F1 Medipol proje klasöründe aç.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const target=path.join(root,manifest.target);
const payload=path.join(__dirname,manifest.payload);
if(!fs.existsSync(target))fail('Dosya bulunamadı: '+manifest.target);
if(!fs.existsSync(payload)||sha(fs.readFileSync(payload))!==manifest.after_sha256)fail('Paket bozuk, ZIP dosyasını yeniden aç.');
const originalSha=sha(fs.readFileSync(target));
if(originalSha===manifest.after_sha256){console.log('✅ Graphics 3.8.1 zaten kurulmuş. Dosyalar değiştirilmedi.');process.exit(0);}
if(originalSha!==manifest.before_sha256)fail('Mevcut engine.ts Graphics 3.8 sürümüyle eşleşmiyor. Dosyaya dokunulmadı.\nBulunan SHA-256: '+originalSha);
const backup=path.join(root,'.kart-rush-backups','g38-1-build-fix-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backupFile=path.join(backup,manifest.target);
const temp=target+'.g381tmp';
try{
  fs.mkdirSync(path.dirname(backupFile),{recursive:true});
  fs.copyFileSync(target,backupFile);
  fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
  fs.copyFileSync(payload,temp);
  if(sha(fs.readFileSync(temp))!==manifest.after_sha256)throw new Error('Paket dosyası geçici kopyada doğrulanamadı.');
  fs.renameSync(temp,target);
  if(sha(fs.readFileSync(target))!==manifest.after_sha256)throw new Error('Kurulum sonrası doğrulama başarısız.');
}catch(error){
  try{if(fs.existsSync(temp))fs.unlinkSync(temp);}catch{}
  try{if(fs.existsSync(backupFile))fs.copyFileSync(backupFile,target);}catch{}
  fail('Eski sürüm geri yüklendi: '+error.message);
}
console.log('✓ components/kart-rush/engine.ts');
console.log('✅ G3.8.1 düzeltmesi kuruldu: Tribün bayrağı değişkenleri doğru sırada.');
console.log('Yedek: '+backup);
console.log('Şimdi: npm.cmd run build -- --webpack');
