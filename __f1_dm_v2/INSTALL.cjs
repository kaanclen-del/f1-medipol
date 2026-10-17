/* F1 Medipol / DM2 installer; safely patches current project with dated backups. */
const fs = require('fs');
const path = require('path');
const project = process.cwd();
const appDir = fs.existsSync(path.join(project,'app','page.tsx')) ? path.join(project,'app') : path.join(project,'src','app');
const baseDir = path.dirname(appDir);
if (!fs.existsSync(path.join(project,'package.json')) || !fs.existsSync(appDir)){
  console.error('HATA: VS Code terminalinde F1 Medipol projesinin kok klasorune gec.');process.exit(1);
}
const head=path.join(baseDir,'components','Header.tsx');
const dm=path.join(baseDir,'components','DmDock.tsx');
if(!fs.existsSync(head)||!fs.existsSync(dm)){
 console.error('HATA: Header.tsx veya DmDock.tsx bulunamadi. Once Friends & DM V1 paketini kurmalisin.');process.exit(1);
}
const oldHeader=fs.readFileSync(head,'utf8');
if(!oldHeader.includes('NotificationBell')){console.error('HATA: Mevcut Header icinde NotificationBell bulunamadi; guvenli kurulum durduruldu.');process.exit(1);}
const initial=fs.readFileSync(dm,'utf8');
if(!initial.includes('dm_send_message')){console.error('HATA: Eski DM dosyasi beklenen surumde degil. Manuel kontrol gerekli.');process.exit(1);}
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const backupDir=path.join(project,'__f1_dm_v2_backups',stamp);
fs.mkdirSync(backupDir,{recursive:true});
function writeSafe(destination, content){
 fs.mkdirSync(path.dirname(destination),{recursive:true});
 if(fs.existsSync(destination)){
  const rel=path.relative(baseDir,destination);const save=path.join(backupDir,rel);
  fs.mkdirSync(path.dirname(save),{recursive:true});fs.copyFileSync(destination,save);
 }
 fs.writeFileSync(destination,content,'utf8');
 console.log('OK:',path.relative(project,destination));
}
function fromPkg(rel){return fs.readFileSync(path.join(__dirname,rel),'utf8');}
let header=oldHeader;
if(!header.includes('from "@/components/WelcomeTour"')&&!header.includes("from '@/components/WelcomeTour'")){
 const quote=header.includes('"use client"')?'"use client"':"'use client'";
 if(!header.includes(quote)){console.error('HATA: Header istemci bileseni degil.');process.exit(1);}
 header=header.replace(quote+';',m=>m+'\nimport WelcomeTour from "@/components/WelcomeTour";');
}
if(!header.includes('<WelcomeTour')){
 const bell=/<NotificationBell\b[^>]*\/>/;
 if(!bell.test(header)){console.error('HATA: Header notification baglanti noktasi bulunamadi.');process.exit(1);}
 header=header.replace(bell,m=>m+'\n          <WelcomeTour />');
}
for(const name of ['DmDock.tsx','DmDock.module.css','WelcomeTour.tsx','WelcomeTour.module.css']){
 writeSafe(path.join(baseDir,'components',name),fromPkg('components/'+name));
}
if(header!==oldHeader)writeSafe(head,header);
const login=path.join(appDir,'login','page.tsx');
if(fs.existsSync(login)){
 let s=fs.readFileSync(login,'utf8');const prev=s;
 s=s.replace(/window\.location\.(?:assign\(\s*["']\/predict["']\s*\)|href\s*=\s*["']\/predict["'])/g,'window.location.assign("/")');
 s=s.replace(/router\.push\(\s*["']\/predict["']\s*\)/g,'router.push("/")');
 if(s!==prev)writeSafe(login,s);
 else console.warn('UYARI: Login yonlendirmesi farkli. app/login/page.tsx icindeki basarili giris yonlendirmesini kontrol et.');
} else console.warn('UYARI: login/page.tsx bulunamadi.');
for(const rel of ['app/members/[id]/page.tsx','app/members/[id]/page.module.css']){
 writeSafe(path.join(baseDir,rel),fromPkg(rel));
}
// Push altyapisi kuruluysa otomatik push endpoint eklenir; degilse ozellik bozulmaz.
const pushHelper=path.join(baseDir,'lib','push','web-push.ts');
if(fs.existsSync(pushHelper)){
 writeSafe(path.join(appDir,'api','dm','push','route.ts'),fromPkg('app/api/dm/push/route.ts'));
 console.log('PUSH: mevcut PWA altyapisina baglandi; VAPID ve cihaz izinleri gerekli.');
}else console.warn('PUSH UYARISI: lib/push/web-push.ts bulunamadi. Push route eklenmedi. Site ici DM bildirimleri calismaya devam eder.');
const bell=path.join(baseDir,'components','NotificationBell.tsx');
if(fs.existsSync(bell)){
 let s=fs.readFileSync(bell,'utf8');
 if(!s.includes('dm-v2-notification-channel')&&s.includes('const reload = useCallback')){
  if (!s.includes('from "@/utils/supabase/client"') && !s.includes("from '@/utils/supabase/client'")) {
    s=s.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { createClient } from "@/utils/supabase/client";');
  }
  const marker='  const unread = items.filter(item => item.read_at === null).length;';
  const effect=`  // dm-v2-notification-channel: realtime + hafif polling yedegi\n  useEffect(() => {\n    const supabase=createClient();\n    let active=true;\n    let channel: ReturnType<typeof supabase.channel> | null = null;\n    void supabase.auth.getUser().then(({data})=>{\n      if(!active||!data.user)return;\n      channel=supabase.channel('bell-dm-v2-'+data.user.id)\n        .on('postgres_changes',{event:'INSERT',schema:'public',table:'site_notifications',filter:'user_id=eq.'+data.user.id},()=>void reload())\n        .subscribe();\n    });\n    const interval=window.setInterval(()=>{if(!document.hidden)void reload();},12000);\n    return ()=>{active=false;window.clearInterval(interval);if(channel)void supabase.removeChannel(channel);};\n  },[reload]);\n\n`;
  if(s.includes(marker))writeSafe(bell,s.replace(marker,effect+marker));
  else console.warn('Bildirim zili beklenenden farkli. Polling duzenlemesi atlandi.');
 }
}
console.log('\nKURULUM BITTI. SQL Editor: __f1_dm_v2/supabase/DM_V2_MEDIA_ONBOARDING.sql\nSONRA: npm.cmd run build ve npm.cmd run dev -- --webpack');
console.log('YEDEK:',backupDir);
