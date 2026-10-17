"use strict";
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const pkg=__dirname, sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const norm=b=>b.toString('utf8').replace(/\r\n/g,'\n');
try{
 const stateFile=path.join(pkg,'last-install.json');if(!fs.existsSync(stateFile))throw Error('Bu paketle yapilmis kurulum kaydi bulunamadi.');
 const {root,backup}=JSON.parse(fs.readFileSync(stateFile,'utf8'));
 const idx=JSON.parse(fs.readFileSync(path.join(backup,'restore-index.json'),'utf8'));
 const plan=idx.files.map(f=>{
  const dst=path.join(root,f.path),src=path.join(backup,f.path),original=fs.readFileSync(src),now=fs.readFileSync(dst);
  if(sha(original)!==f.originalSha)throw Error('Yedek bozulmus: '+f.path);
  if(sha(Buffer.from(norm(now),'utf8'))!==f.updatedSha)throw Error('Dosya sonradan degistirilmis; geri alma durduruldu: '+f.path);
  return{dst,original};
 });
 for(const p of plan){const tmp=p.dst+'.g626restore';fs.writeFileSync(tmp,p.original);fs.renameSync(tmp,p.dst);}
 fs.unlinkSync(stateFile);
 console.log('[OK] G6.2.6 geri alindi. Yedekteki dosyalar birebir geri yuklendi.');
}catch(e){console.error('[HATA] Geri alma durduruldu: '+e.message);process.exitCode=1;}
