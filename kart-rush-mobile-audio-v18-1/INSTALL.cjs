'use strict';
/** Kart Rush V18.1: guarded patch (V17 race HUD callback compatibility); does not overwrite engine or existing client/menu. */
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const fail=m=>{console.error('\n❌ KURULUM DURDU: '+m);process.exit(1)};
if(!fs.existsSync(path.join(root,'package.json')))fail('Terminali package.json dosyasının bulunduğu F1 Medipol ana klasöründe aç.');
const locations=[path.join(root,'components','kart-rush'),path.join(root,'src','components','kart-rush')];
const dest=locations.find(d=>fs.existsSync(path.join(d,'KartRushTrack.tsx')));
if(!dest)fail('components/kart-rush/KartRushTrack.tsx bulunamadı; hiçbir dosya değiştirilmedi.');
const trackPath=path.join(dest,'KartRushTrack.tsx'),cssPath=path.join(dest,'kartRush.module.css'),audioPath=path.join(dest,'raceAmbience.ts');
if(!fs.existsSync(cssPath)||!fs.existsSync(path.join(dest,'sound.ts')))fail('Kart Rush ses veya CSS dosyası eksik; hiçbir dosya değiştirilmedi.');
const originalTrack=fs.readFileSync(trackPath,'utf8'),originalCss=fs.readFileSync(cssPath,'utf8');
const cssFragment=fs.readFileSync(path.join(__dirname,'MOBILE_OVERRIDES.css'),'utf8');
const audioFragment=fs.readFileSync(path.join(__dirname,'raceAmbience.ts'),'utf8');
const marker='/* KR-MOBILE-AUDIO-V18 */';
if(originalTrack.includes('KartRushAmbientSound')&&originalCss.includes(marker)&&fs.existsSync(audioPath)){
 console.log('✅ Kart Rush V18 zaten kurulu. Dosyalara dokunulmadı.');process.exit(0);
}
if(originalTrack.includes('KartRushAmbientSound')||originalCss.includes(marker)||fs.existsSync(audioPath))fail('V18 kısmen veya farklı biçimde uygulanmış görünüyor. Otomatik olarak üstüne yazmıyorum.');
if(!/import\s*\{\s*KartRushSound\s*\}\s*from\s*['"]\.\/sound['"]/.test(originalTrack) ||
   !originalTrack.includes('const sound=useRef<KartRushSound|null>(null);') ||
   !originalTrack.includes('onHud:next=>') ||
   !originalTrack.includes('const pressProps=') ||
   !originalTrack.includes('className={s.raceBottom}') ||
   !originalTrack.includes('className={s.leaderboardToggle}') ||
   !originalTrack.includes('className={s.speedHud}')){
 fail('Mevcut yarış ekranının yapısı bilinen V15-V17 ile uyuşmuyor. Mevcut kodu korumak için işlem yapılmadı.');
}
let output=originalTrack;
function replaceOnce(from,to,label){
 const i=output.indexOf(from);
 if(i<0||output.indexOf(from,i+from.length)>=0)fail(label+' alanı beklenen şekilde bulunamadı. Dosyalar değişmedi.');
 output=output.slice(0,i)+to+output.slice(i+from.length);
}
replaceOnce("import { KartRushSound } from './sound';",
 "import { KartRushSound } from './sound';\nimport { KartRushAmbientSound } from './raceAmbience';",'Ses importu');
replaceOnce('const sound=useRef<KartRushSound|null>(null);',
 'const sound=useRef<KartRushSound|null>(null);\n const ambience=useRef<KartRushAmbientSound|null>(null);','Ses referansı');
replaceOnce('if(on)sound.current?.activate();',
 'if(on){sound.current?.activate();ambience.current?.activate();}','Gaz/direksiyon ses açma');
replaceOnce('sound.current?.activate();engine.current?.usePower();',
 'sound.current?.activate();ambience.current?.activate();engine.current?.usePower();','Özel güç ses açma');
replaceOnce('sound.current?.activate();engine.current?.honk();',
 'sound.current?.activate();ambience.current?.activate();engine.current?.honk();','Korna ses açma');
replaceOnce('sound.current?.update(0,false,next);setPaused(next);',
 'sound.current?.update(0,false,next);ambience.current?.mute(next);setPaused(next);','Duraklatma sesleri');
replaceOnce('if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);',
 'if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);ambience.current?.mute(true);','Yarış sonu sesleri');
replaceOnce('useEffect(()=>{const audio=new KartRushSound(volume);sound.current=audio;return()=>{audio.dispose();sound.current=null;};},[]);',
 'useEffect(()=>{const audio=new KartRushSound(volume);sound.current=audio;return()=>{audio.dispose();sound.current=null;};},[]);\n useEffect(()=>{const audio=new KartRushAmbientSound(volume);ambience.current=audio;return()=>{audio.dispose();ambience.current=null;};},[]);', 'Ses yaşam döngüsü');
replaceOnce('useEffect(()=>{sound.current?.setVolume(volume);},[volume]);',
 'useEffect(()=>{sound.current?.setVolume(volume);ambience.current?.setVolume(volume);},[volume]);','Ses ayarı');
// V17/current live track code may pass only pausedRef.current to the own-engine sound.
// Newer V15 sources may also include finishOnce.current. Preserve whichever is present.
const hudPatterns=[
 'sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current||finishOnce.current);',
 'sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current);'
];
const hudCandidates=hudPatterns.filter(p=>output.includes(p));
if(hudCandidates.length!==1)fail('Yarış HUD ses güncellemesi V17/V15 biçiminde bulunamadı; hiçbir dosya değiştirilmedi.');
const hudOriginal=hudCandidates[0];
replaceOnce(hudOriginal,
 hudOriginal+'ambience.current?.update(next,userId,TRACK_METERS,pausedRef.current||finishOnce.current);',
 'Rakip ses güncellemesi');
replaceOnce('onEffect:effect=>sound.current?.effect(effect)',
 'onEffect:effect=>{sound.current?.effect(effect);ambience.current?.effect(effect);}', 'Efekt bağlantısı');
const boardAnchor='  <div className={`${s.standings} ${showLeaderboard?s.boardOpen:\'\'}`}';
replaceOnce(boardAnchor,
 '  <button type="button" className={s.mobileCameraToggle} onClick={()=>{sound.current?.activate();ambience.current?.activate();cycleCamera();}} aria-label="Kamerayı değiştir">▣ KAMERA</button>\n'+boardAnchor,
 'Mobil kamera düğmesi');
const scrollHook = ` useEffect(()=>{
  const mq=window.matchMedia('(pointer:coarse) and (max-width:1100px)');
  if(!mq.matches)return;
  const prevBody=document.body.style.overflow;
  const prevOverscroll=document.documentElement.style.overscrollBehavior;
  document.body.style.overflow='hidden';
  document.documentElement.style.overscrollBehavior='none';
  return()=>{document.body.style.overflow=prevBody;document.documentElement.style.overscrollBehavior=prevOverscroll;};
 },[]);
`;
replaceOnce(" useEffect(()=>{\n  const onFs=",scrollHook+" useEffect(()=>{\n  const onFs=",'Mobil kaydırma kilidi');

const updatedCss=originalCss.replace(/\s*$/, '')+'\n\n'+marker+'\n'+cssFragment.trimEnd()+'\n';
const changes=[{name:'KartRushTrack.tsx',file:trackPath,before:originalTrack,after:output},
 {name:'kartRush.module.css',file:cssPath,before:originalCss,after:updatedCss},
 {name:'raceAmbience.ts',file:audioPath,before:null,after:audioFragment}];
const backup=path.join(root,'.kart-rush-backups','mobile-audio-v18-1-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const c of changes){if(c.before!==null)fs.writeFileSync(path.join(backup,c.name),c.before,'utf8');}
 fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({projectRoot:root,entries:changes.map(c=>({target:c.file,backup:c.name,existed:c.before!==null}))},null,2),'utf8');
}catch(e){fail('Yedek oluşturulamadı: '+e.message);}
try{
 for(const c of changes){
  const tmp=c.file+'.v18-tmp';
  try{fs.writeFileSync(tmp,c.after,'utf8');fs.renameSync(tmp,c.file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
 }
}catch(e){
 for(const c of changes){try{if(c.before===null){if(fs.existsSync(c.file))fs.unlinkSync(c.file);}else fs.writeFileSync(c.file,c.before,'utf8');}catch{}}
 fail('Kurulum başarısız; önceki dosyalar geri yüklenmeye çalışıldı: '+e.message);
}
console.log('\n✅ KART RUSH V18.1 MOBİL HUD + SES KURULDU');
console.log('✓ Ekranı kaplayan mobil yarış ve tuşların ayrılması');
console.log('✓ Ayrı mobil kamera düğmesi');
console.log('✓ Yakın rakiplerin motorları, rüzgâr ve temas efektleri');
console.log('✓ Yarış mekaniği / Supabase / ana menü değiştirilmedi');
console.log('Yedek:',backup);
console.log('Sonraki komut: npm.cmd run build -- --webpack');
