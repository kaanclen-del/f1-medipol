#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const fail=(m)=>{console.error('\n❌ KURULUM DURDU: '+m);process.exit(1);};
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(path.join(root,'package.json')))fail('Terminali F1 Medipol proje klasöründe açmalısın.');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const backup=path.join(root,'.kart-rush-backups','g37-3-final-cockpit-'+new Date().toISOString().replace(/[:.]/g,'-'));
const installed=[];
for(const file of manifest.files){
  const target=path.join(root,file.path);
  const payload=path.join(__dirname,'payload',file.asset);
  if(!fs.existsSync(target))fail('Hedef dosya bulunamadı: '+file.path);
  if(!fs.existsSync(payload))fail('Paket eksik: '+file.asset);
  const payloadSha=sha(fs.readFileSync(payload));
  if(payloadSha!==file.sha256)fail('Paket doğrulaması başarısız: '+file.asset);
  const currentSha=sha(fs.readFileSync(target));
  if(currentSha===file.sha256){console.log('✓ zaten güncel: '+file.path);continue;}
  if(!file.allowedOriginalSha256.includes(currentSha)){
    fail('Uyumsuz kaynak sürümü: '+file.path+'\nBeklenen SHA(lar): '+file.allowedOriginalSha256.join(', ')+'\nBulunan SHA: '+currentSha+'\nÖnce gerekli önceki sürümün kurulu olduğundan emin ol.');
  }
}
for(const file of manifest.files){
  const target=path.join(root,file.path);
  const payload=path.join(__dirname,'payload',file.asset);
  const currentSha=sha(fs.readFileSync(target));
  if(currentSha===file.sha256)continue;
  const backupTarget=path.join(backup,file.path);
  fs.mkdirSync(path.dirname(backupTarget),{recursive:true});
  fs.copyFileSync(target,backupTarget);
  const temp=target+'.g373tmp';
  try{
    fs.copyFileSync(payload,temp);
    if(sha(fs.readFileSync(temp))!==file.sha256)throw new Error('Geçici dosya doğrulanamadı: '+file.path);
    fs.renameSync(temp,target);
    if(sha(fs.readFileSync(target))!==file.sha256)throw new Error('Yazılan dosya doğrulanamadı: '+file.path);
    installed.push(file.path);
    console.log('✓ '+file.path);
  }catch(err){
    try{if(fs.existsSync(temp))fs.unlinkSync(temp);}catch{}
    for(const done of installed){
      const restoreFrom=path.join(backup,done);
      const restoreTo=path.join(root,done);
      if(fs.existsSync(restoreFrom))fs.copyFileSync(restoreFrom,restoreTo);
    }
    fail('Değişiklik geri alındı: '+err.message);
  }
}
fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest,null,2),'utf8');
console.log('\n✅ GRAPHICS 3.7.3 — SON KOKPİT POLISH KURULDU');
console.log('Düzeltilenler:');
console.log('- İç kokpit daha dolu ve daha kaliteli hale getirildi');
console.log('- Ön lastik yönü düzeltildi (A = sola, D = sağa)');
console.log('- Klavye / gamepad algılanınca dokunmatik kontroller otomatik gizlenir');
console.log('Yedek: '+backup);
console.log('Sonraki adım: npm.cmd run build -- --webpack');
