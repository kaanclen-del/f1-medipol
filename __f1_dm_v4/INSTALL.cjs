/* F1 Medipol DM 4 — sayfa mimarisi, mevcut veriler korunur. */
const fs = require('fs');
const path = require('path');
const root=process.cwd();
if(!fs.existsSync(path.join(root,'package.json'))) {
  console.error('HATA: Terminal F1 Medipol proje klasorunde degil.');process.exit(1);
}
const appRel=fs.existsSync(path.join(root,'app','page.tsx'))?'app':fs.existsSync(path.join(root,'src','app','page.tsx'))?'src/app':null;
if(!appRel){console.error('HATA: app/page.tsx veya src/app/page.tsx bulunamadi.');process.exit(1)}
const appRoot=path.join(root,appRel);
const sourceRoot=path.dirname(appRoot);
const comps=path.join(sourceRoot,'components');
const dm=path.join(comps,'DmDock.tsx');
const header=path.join(comps,'Header.tsx');
const login=path.join(appRoot,'login','page.tsx');
const loginCss=path.join(appRoot,'login','login.module.css');
if(!fs.existsSync(dm)||!fs.existsSync(header)||!fs.existsSync(login)||!fs.existsSync(loginCss)){
 console.error('HATA: Gereken DmDock/Header/login dosyalarindan biri bulunamadi; hicbir sey degistirilmedi.');process.exit(1);
}
const originalDm=fs.readFileSync(dm,'utf8');
if(!originalDm.includes('dm_list_friends') && !originalDm.includes('dm_send_message')){
 console.error('HATA: Mevcut DM beklenen surumle uyusmuyor. Guvenlik icin durduruldu.');process.exit(1);
}
const originalLogin=fs.readFileSync(login,'utf8');
if(!originalLogin.includes('styles.columns')){
 console.error('HATA: Login sayfasinin sinif yapisi farkli; otomatik kurulum durduruldu.');process.exit(1);
}
const changes = new Map();
const srcFile = rel => fs.readFileSync(path.join(__dirname,rel),'utf8');
for(const rel of ['components/DmDock.tsx','components/MessagesClient.tsx','components/MessagesClient.module.css','app/messages/page.tsx','app/members/[id]/page.tsx','app/members/[id]/page.module.css']){
 const relInProject=rel.startsWith('app/')?path.join(appRel,rel.slice(4)):path.join(path.relative(root,sourceRoot),rel);
 changes.set(path.join(root,relInProject),srcFile(rel));
}
let loginNext=originalLogin;
loginNext=loginNext.replace('className={styles.columns}', 'className={`${styles.columns} ${register ? styles.registerLayout : ""}`}');
if(loginNext===originalLogin && !loginNext.includes('styles.registerLayout')){console.error('HATA: Kayıt yerleşimi işaretleyicisi bulunamadi.');process.exit(1)}
changes.set(login,loginNext);
let css=fs.readFileSync(loginCss,'utf8');
const styleMarker='/* F1 LOGIN MOBILE REGISTER FIRST V4 */';
if(!css.includes(styleMarker)){
 css+='\n'+styleMarker+'\n@media(max-width:990px){.registerLayout{display:flex!important;flex-direction:column!important;gap:22px!important}.registerLayout .card{order:-1!important}.registerLayout .story{order:1!important}}\n';
}
changes.set(loginCss,css);
const changed=[...changes].filter(([file,content])=>!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content);
if(!changed.length){console.log('DM V4 zaten kurulu.');process.exit(0)}
const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
const backups=path.join(root,'__f1_dm_v4_yedek',timestamp);
for(const [target] of changed)if(fs.existsSync(target)){
 const dest=path.join(backups,path.relative(root,target));
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(target,dest);
}
const completed=[];
try{
 for(const [target,content] of changed){
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,content,'utf8');
  completed.push(target);
 }
}catch(e){
 console.error('KURULUM HATASI:',e.message);
 for(const target of completed){const old=path.join(backups,path.relative(root,target));if(fs.existsSync(old))fs.copyFileSync(old,target);else fs.rmSync(target,{force:true})}
 process.exit(1);
}
console.log('\nF1 MEDIPOL DM V4 BASARIYLA KURULDU');
console.log('Yedek:',backups);
console.log('Degisenler:',changed.map(([f])=>path.relative(root,f)).join(', '));
console.log('Yeni mesajlar: /messages  |  Uye profili: /members/{id}');
console.log('Yeni SQL gerekmez. Derleme: npm.cmd run build -- --webpack');
