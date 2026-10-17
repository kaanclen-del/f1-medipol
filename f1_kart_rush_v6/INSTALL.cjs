/* F1 Medipol Kart Rush DRIVE V6 — safe, reversible V4/V5 → V6 update.
   The ZIP MUST be extracted with f1_kart_rush_v6 inside the Next.js project root.
   Node runs regardless of the current terminal directory.
*/
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const payload=__dirname,root=path.resolve(payload,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(payload,'manifest.json'),'utf8'));
const sha=(bytes)=>crypto.createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
function fail(reason){console.error('\nV6 KURULUMU DURDU: '+reason);process.exitCode=1;}
if(!fs.existsSync(path.join(root,'package.json'))||!fs.existsSync(path.join(root,'app','arcade','kart-rush','page.tsx'))){
 fail('ZIP dosyasını Next.js proje ana klasörüne AÇ. Beklenen: <proje>/f1_kart_rush_v6/INSTALL.cjs');
}else{
 const changes=[];let problem='';
 for(const [rel,expect] of Object.entries(manifest.files)){
  const target=path.join(root,rel),src=path.join(payload,rel);
  if(!fs.existsSync(src)){problem='Pakette eksik dosya: '+rel;break;}
  const next=fs.readFileSync(src),actual=fs.existsSync(target)?sha(fs.readFileSync(target)):null;
  if(sha(next)!==expect.current){problem='Paket bütünlüğü bozulmuş: '+rel;break;}
  if(actual===expect.current)continue;
  if(actual!==null&&!expect.previous.includes(actual)){problem='Bu projedeki '+rel+' dosyası V4/V5 ile eşleşmiyor. Güvenlik için değiştirmedim. Önce farklı bir sürüm veya özel düzenleme olup olmadığını kontrol et.';break;}
  if(actual===null&&expect.previous.length){problem='Mevcut oyun dosyası eksik: '+rel;break;}
  changes.push({rel,target,next,existed:actual!==null});
 }
 if(problem){fail(problem);}
 else if(!changes.length){console.log('Kart Rush DRIVE V6 zaten kurulu.');}
 else{
  const now=new Date().toISOString().replace(/[:.]/g,'-');
  const backup=path.join(root,'.kart-rush-backups','v6-'+now);
  const written=[];let failure='';
  try{
   for(const item of changes){if(!item.existed)continue;
    const dst=path.join(backup,item.rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(item.target,dst);
   }
   for(const item of changes){
    fs.mkdirSync(path.dirname(item.target),{recursive:true});
    const temp=item.target+'.drive-v6.tmp';fs.writeFileSync(temp,item.next);fs.renameSync(temp,item.target);written.push(item);
   }
  }catch(e){
   failure=String(e&&e.message||e);
   for(const item of written.reverse()){
    try{if(item.existed)fs.copyFileSync(path.join(backup,item.rel),item.target);else fs.unlinkSync(item.target);}catch{}
   }
  }
  if(failure)fail('Kurulum sırasında hata çıktı, yazılan dosyalar geri alındı: '+failure);
  else{
   console.log('\n✔ Kart Rush DRIVE V6 başarıyla kuruldu.');
   for(const x of changes)console.log('  + '+x.rel);
   console.log('Yedek: '+backup);
   console.log('Yeni SQL gerekmez. Yeni npm bağımlılığı gerekmez.');
   console.log('Çalıştır: npm.cmd run dev');
   console.log('Sayfa: /arcade/kart-rush');
  }
 }
}
