'use strict';
// Exact-version installer. Based on user-supplied game sources and V19.1 update.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const manifest=require('./manifest.json');
const fail=message=>{console.error('\n❌ KURULUM DURDU: '+message);process.exit(1);};
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const choices=[path.join(root,'components','kart-rush'),path.join(root,'src','components','kart-rush')];
if(!fs.existsSync(path.join(root,'package.json')))fail('Önce terminalde f1-medipol ana klasörüne geç.');
const dir=choices.find(d=>manifest.files.every(n=>fs.existsSync(path.join(d,n))));
if(!dir)fail('components/kart-rush oyun dosyaları bulunamadı.');
const targets=manifest.files.map(n=>({name:n,target:path.join(dir,n),source:path.join(__dirname,'payload',n+'.txt')}));
const asset=path.join(root,manifest.asset);
const assetPayload=path.join(__dirname,'assets','kart-rush-f1medipol-logo.png');
for(const f of targets)if(!fs.existsSync(f.source))fail('Paket eksik: '+f.name);
if(!fs.existsSync(assetPayload))fail('Sponsor logo dosyası ZIP içinde bulunamadı.');
const mismatched=targets.filter(f=>sha(f.target)!==manifest.requiredCurrentSha256[f.name]);
if(mismatched.length){
 // Return idempotently if already installed, without producing an unnecessary new backup.
 const installed=targets.every(f=>sha(f.target)===sha(f.source))&&fs.existsSync(asset)&&sha(asset)===sha(assetPayload);
 if(installed){console.log('✅ V20.1 zaten kurulu. Dosyalar değiştirilmedi.');process.exit(0);}
 fail('Bu paket V19.1 kurulmuş kaynak dosyaları için hazırlandı. Farklı dosyalar: '+mismatched.map(f=>f.name).join(', ')+'. Çalışan kodun üzerine yazılmadı.');
}
const backupDir=path.join(root,'.kart-rush-backups','v20-1-'+new Date().toISOString().replace(/[:.]/g,'-'));
const hadAsset=fs.existsSync(asset);
try{
 fs.mkdirSync(backupDir,{recursive:true});
 for(const f of targets)fs.copyFileSync(f.target,path.join(backupDir,f.name));
 if(hadAsset)fs.copyFileSync(asset,path.join(backupDir,'previous-sponsor-logo.png'));
 fs.writeFileSync(path.join(backupDir,'restore.json'),JSON.stringify({dir,asset,hadAsset,files:manifest.files},null,2),'utf8');
}catch(e){fail('Yedek alınamadı, dosyalar değiştirilmedi: '+e.message);}
try{
 for(const f of targets){
  const tmp=f.target+'.v201-tmp';
  try{fs.copyFileSync(f.source,tmp);fs.renameSync(tmp,f.target);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
 }
 fs.mkdirSync(path.dirname(asset),{recursive:true});fs.copyFileSync(assetPayload,asset);
}catch(e){
 console.error('⚠ Kurulum sırasında hata. Eski dosyalar geri yükleniyor...');
 for(const f of targets)try{fs.copyFileSync(path.join(backupDir,f.name),f.target);}catch{}
 try{if(hadAsset)fs.copyFileSync(path.join(backupDir,'previous-sponsor-logo.png'),asset);else if(fs.existsSync(asset))fs.unlinkSync(asset);}catch{}
 fail('Dosya kopyalama hatası: '+e.message+' — Yedek: '+backupDir);
}
console.log('\n✅ KART RUSH V20.1 KURULDU');
console.log('• V19.1 finiş sistemi ve mevcut sürüş fiziği korundu.');
console.log('• Gerçek logo görseli pist reklam panosu atlasına eklendi.');
console.log('• Gelişmiş asfalt / çim / metal shader detayları ve ek geçiş sesleri eklendi.');
console.log('• Kurulum dosyaları .txt payload kullanır, Next.js onları TSX olarak derlemez.');
console.log('Yedek:',backupDir);
console.log('Şimdi eski V19.1 kurulum klasörünü proje dışına taşıdıktan sonra npm.cmd run build -- --webpack.');
