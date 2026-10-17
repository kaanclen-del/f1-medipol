'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const rel='components/kart-rush/engine.ts';
const target=path.join(root,rel);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
const hash=(s)=>crypto.createHash('sha256').update(s).digest('hex');
function fail(message){console.error('\n❌ SHADER DÜZELTMESİ DURDU: '+message);process.exit(1);}
if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(target))fail('F1 Medipol projesinin ana klasöründe çalıştır.');
const original=fs.readFileSync(target,'utf8');
if(hash(original)===manifest.targetSha){console.log('✅ Graphics 2.0 shader düzeltmesi zaten kurulu; dosya değişmedi.');process.exit(0);}
if(hash(original)!==manifest.sourceSha){
 fail('engine.ts, yüklenen Graphics 2.0 Stage 1 sürümüyle eşleşmiyor. Güvenlik için dosyaya dokunulmadı. Lütfen güncel engine.ts dosyasını paylaş.');
}
if(original.split(manifest.old1).length!==2||original.split(manifest.old2).length!==2){
 fail('Düzeltilecek shader satırları bulunamadı; dosyaya dokunulmadı.');
}
const revised=original.replace(manifest.old1,manifest.new1).replace(manifest.old2,manifest.new2);
if(hash(revised)!==manifest.targetSha)fail('Düzeltilen kod beklenen SHA-256 ile eşleşmiyor.');
const backupFolder=path.join(root,'.kart-rush-backups','graphics2-shader-'+new Date().toISOString().replace(/[:.]/g,'-'));
const backupFile=path.join(backupFolder,'engine.ts');
const currentPointer=path.join(root,'.kart-rush-backups','graphics2-shader-current.json');
let wroteTarget=false;
try{
 fs.mkdirSync(backupFolder,{recursive:true});
 fs.writeFileSync(backupFile,original,'utf8');
 if(hash(fs.readFileSync(backupFile))!==manifest.sourceSha)throw Error('Yedek doğrulanamadı.');
 const temp=target+'.g2-shader-temp';
 fs.writeFileSync(temp,revised,'utf8');
 if(hash(fs.readFileSync(temp))!==manifest.targetSha){fs.unlinkSync(temp);throw Error('Geçici dosya doğrulanamadı.');}
 fs.renameSync(temp,target);wroteTarget=true;
 fs.writeFileSync(currentPointer,JSON.stringify({backupFile,sourceSha:manifest.sourceSha,targetSha:manifest.targetSha},null,2),'utf8');
 console.log('✅ GRAPHICS 2.0 shader hatası düzeltildi.');
 console.log('Yalnızca '+rel+' güncellendi.');
 console.log('Yedek: '+backupFile);
 console.log('Şimdi npm.cmd run build -- --webpack komutunu çalıştır, ardından sayfayı yenile.');
}catch(err){
 if(wroteTarget){try{fs.writeFileSync(target,original,'utf8');}catch(e){console.error('⚠ Otomatik geri alma başarısız: '+e.message);}}
 fail('Dosya güncellenemedi: '+err.message);
}
