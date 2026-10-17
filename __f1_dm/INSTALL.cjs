/* F1 MEDIPOL / DM system installer - only additive edits, backup header */
const fs=require('fs'),path=require('path');
const project=process.cwd();
const source=path.join(__dirname,'components');
let appRoot=path.join(project,'app');
if(!fs.existsSync(appRoot)&&fs.existsSync(path.join(project,'src','app')))appRoot=path.join(project,'src','app');
const targetRoot=path.dirname(appRoot);
const header=path.join(targetRoot,'components','Header.tsx');
const outDir=path.join(targetRoot,'components');
if(!fs.existsSync(path.join(project,'package.json'))){ console.error('HATA: Once proje klasorune (f1-medipol) gecmelisin.');process.exit(1); }
if(!fs.existsSync(header)){ console.error('HATA: components/Header.tsx bulunamadi. Dosyalarina dokunulmadi.');process.exit(1); }
let original=fs.readFileSync(header,'utf8');
let modified=original;
const importLine='import DmDock from "@/components/DmDock";';
if(!modified.includes('from "@/components/DmDock"')&&!modified.includes("from '@/components/DmDock'")){
  if(/^"use client";?/m.test(modified)) modified=modified.replace(/^"use client";?/m,m=>m+'\n'+importLine);
  else if(/^'use client';?/m.test(modified)) modified=modified.replace(/^'use client';?/m,m=>m+'\n'+importLine);
  else { console.error('HATA: Header bir client component degil. Dosyalara dokunulmadi.');process.exit(1); }
}
if(!/<DmDock\b/.test(modified)){
  const bell=/<NotificationBell\b[^>]*\/>/;
  if(bell.test(modified)) modified=modified.replace(bell,m=>m+'\n          <DmDock isLight={isLight} />');
  else {
    console.error('HATA: Header icinde NotificationBell bulunamadi. Guvenli entegrasyon icin durduruldu.');process.exit(1);
  }
}
fs.mkdirSync(outDir,{recursive:true});
const backup=header+'.dm-backup-'+new Date().toISOString().replace(/[:.]/g,'-');
if(modified!==original){fs.copyFileSync(header,backup);fs.writeFileSync(header,modified,'utf8');}
for(const file of ['DmDock.tsx','DmDock.module.css']){
  const dest=path.join(outDir,file);
  if(fs.existsSync(dest))fs.copyFileSync(dest,dest+'.bak');
  fs.copyFileSync(path.join(source,file),dest);
  console.log('KURULDU:',path.relative(project,dest));
}
console.log('HEADER:',modified===original?'Zaten bagli.':`Baglandi (yedek: ${path.basename(backup)})`);
console.log('SONRA: Supabase SQL Editor icinde __f1_dm/supabase/DM_FRIENDS_SETUP.sql calistir.');
console.log('SONRA: localhost ana sayfayi ac; header Mesajlar ikonuna tikla.');
