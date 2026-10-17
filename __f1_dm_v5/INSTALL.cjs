// F1 MEDIPOL DM V5 — responsive desktop popup + tablet/mobile full page.
// Only updates the three DM view files; database and existing user data untouched.
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const appRoot = fs.existsSync(path.join(root, 'app', 'page.tsx')) ? root :
  fs.existsSync(path.join(root,'src','app','page.tsx')) ? path.join(root,'src') : null;
if(!fs.existsSync(path.join(root,'package.json')) || !appRoot){
  console.error('HATA: Terminal Next.js proje klasorunde degil.');process.exit(1);
}
const checks=[
  ['components/DmDock.tsx', ['dm_list_friends', 'f1-dm-open']],
  ['components/MessagesClient.tsx', ['dm_send_message', 'pageMode']],
  ['components/MessagesClient.module.css', ['pageMode', 'panel']]
];
for(const [relative,required] of checks){
  const file=path.join(appRoot,relative);
  if(!fs.existsSync(file)){
    console.error('HATA: '+path.relative(root,file)+' bulunamadi. Once DM V4 kurulmus olmali.');process.exit(1);
  }
  const source=fs.readFileSync(file,'utf8');
  if(required.some(marker=>!source.includes(marker))){
    console.error('HATA: '+relative+' mevcut kurulumla eslesmiyor. Hicbir dosya degistirilmedi.');process.exit(1);
  }
}
const changes=checks.map(([relative])=>{
  const source=path.join(__dirname,'components',path.basename(relative));
  return {file:path.join(appRoot,relative),content:fs.readFileSync(source,'utf8')};
}).filter(item=>fs.readFileSync(item.file,'utf8')!==item.content);
if(changes.length===0){console.log('DM V5 zaten kurulu.');process.exit(0)}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(root,'__f1_dm_v5_yedek',stamp);
for(const item of changes){
  const destination=path.join(backup,path.relative(root,item.file));
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(item.file,destination);
}
const written=[];
try{
  for(const item of changes){fs.writeFileSync(item.file,item.content,'utf8');written.push(item.file)}
}catch(err){
  for(const file of written){const source=path.join(backup,path.relative(root,file));fs.copyFileSync(source,file)}
  console.error('KURULUM HATASI: '+err.message);process.exit(1)
}
console.log('\nF1 MEDIPOL — DM V5 KURULDU');
console.log('Guncellenen dosyalar:');
for(const item of changes)console.log(' - '+path.relative(root,item.file));
console.log('Yedek klasoru: '+backup);
console.log('Masaustu: Header mesaji -> sag alt popup');
console.log('Telefon/tablet: Header mesaji -> /messages tam sayfa');
console.log('Yeni SQL gerekmiyor.');
