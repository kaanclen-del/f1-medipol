'use strict';
/** F1 Medipol Kart Rush V19 - rich power audio and post-finish parade.
 * Does not replace original source files. Fails safely if the known V18.x structure differs.
 */
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
function fail(message){console.error('\n❌ KURULUM DURDU: '+message);process.exit(1);}
if(!fs.existsSync(path.join(root,'package.json')))fail('Komutu f1-medipol ana klasöründe çalıştır.');
const variants=[path.join(root,'components','kart-rush'),path.join(root,'src','components','kart-rush')];
const dir=variants.find(d=>fs.existsSync(path.join(d,'engine.ts')));
if(!dir)fail('Kart Rush oyun dosyaları bulunamadı.');
const targets=['engine.ts','KartRushTrack.tsx','sound.ts','kartRush.module.css'];
if(targets.some(f=>!fs.existsSync(path.join(dir,f))))fail('Kart Rush dosyalarından biri eksik.');
const before=Object.fromEntries(targets.map(f=>[f,fs.readFileSync(path.join(dir,f),'utf8')]));
const marker='/* KR-V19-FINISH-PARADE */';
if(before['engine.ts'].includes('KR-V19-FINISH-PARADE') && before['sound.ts'].includes('KR-V19-RICH-SFX') && before['KartRushTrack.tsx'].includes('KR-V19-RESULTS-UI') && before['kartRush.module.css'].includes(marker)){
 console.log('✅ Kart Rush V19 zaten kurulu; hiçbir dosya değiştirilmedi.');process.exit(0);
}
if(targets.some(f=>before[f].includes('KR-V19-')))fail('V19 kısmen kurulu görünüyor; üzerine yazılmadı. İlgili dosyaları kontrol et.');
let eng=before['engine.ts'], ui=before['KartRushTrack.tsx'],snd=before['sound.ts'],css=before['kartRush.module.css'];
function once(src,oldValue,newValue,label){
 const i=src.indexOf(oldValue);
 if(i===-1||src.indexOf(oldValue,i+oldValue.length)!==-1)fail(label+' için beklenen kod bulunamadı veya birden fazla bulundu. Dosyalar değişmedi.');
 return src.slice(0,i)+newValue+src.slice(i+oldValue.length);
}
if(!eng.includes('private winner=false;') || !eng.includes('private stepBot(bot:Bot,dt:number)') || !eng.includes('this.opt.onFinish?.('))fail('V18.x engine yapısı tanınmıyor. Dosyalar değiştirilmedi.');
eng=once(eng,'if(!this.paused&&!this.winner){\n    // Fixed-step integration keeps the car consistent if FPS drops from 60 to 25.',
 `if(!this.paused){\n    if(this.winner){ this.postFinishParade(dt); }\n    else {\n    // Fixed-step integration keeps the car consistent if FPS drops from 60 to 25.`, 'Yarış sonu animasyon döngüsü');
eng=once(eng,'if(iterations===4)this.acc=0;\n   }\n   this.render(dt);',
 'if(iterations===4)this.acc=0;\n    }\n   }\n   this.render(dt);','Yarış döngüsü kapanışı');
eng=once(eng,'private stepBot(bot:Bot,dt:number){\n  if(bot.finished)return;',
 'private stepBot(bot:Bot,dt:number){\n  // V19: completed bots retain their finishing time, but keep moving on the circuit.','Bot finişi');
eng=once(eng,'if(bot.progress>=START_PROGRESS+this.opt.laps){bot.finished=true;bot.finishMs=Math.round(this.elapsed*1000);}',
 'if(!bot.finished&&bot.progress>=START_PROGRESS+this.opt.laps){bot.finished=true;bot.finishMs=Math.round(this.elapsed*1000);}', 'Bot süre dondurma');
eng=once(eng,'if(bot.powerCooldown<=0){\n   bot.powerCooldown=12+this.rng()*11;',
 'if(bot.powerCooldown<=0&&!this.winner){\n   bot.powerCooldown=12+this.rng()*11;', 'Finiş sonrası bot güçlerini kapatma');
// Only announce rival abilities within realistic audible distance, without changing AI decisions.
eng=once(eng,"if(roll<.54){bot.boostTime=2.8;this.pulseBot(bot,'#58e4fb');}",
 "if(roll<.54){bot.boostTime=2.8;this.pulseBot(bot,'#58e4fb');if(Math.hypot(this.playerX-loc.x,this.playerZ-loc.z)<90)this.opt.onEffect?.('rival-turbo');}", 'Yakın bot turbo sesi');
eng=once(eng,"else if(roll<.83){bot.shieldTime=4;this.pulseBot(bot,'#73bbff');}",
 "else if(roll<.83){bot.shieldTime=4;this.pulseBot(bot,'#73bbff');if(Math.hypot(this.playerX-loc.x,this.playerZ-loc.z)<70)this.opt.onEffect?.('rival-shield');}", 'Yakın bot kalkan sesi');
eng=once(eng,' private stepPlayer(dt:number){', ` // KR-V19-FINISH-PARADE: preserve result, keep the player's car and AI moving after the flag.\n private postFinishParade(dt:number){\n  this.clock+=dt;\n  this.speedMS=lerp(this.speedMS,25,clamp(dt*.9,0,1));\n  this.overallProgress+=this.speedMS*dt/TRACK_METERS;\n  this.progress=wrap(this.overallProgress);\n  const position=positionAt(this.overallProgress,clamp(this.lane,-5,5));\n  const smooth=clamp(dt*5,0,1);\n  this.playerX=lerp(this.playerX,position.x,smooth);\n  this.playerZ=lerp(this.playerZ,position.z,smooth);\n  let delta=position.angle-this.heading;\n  while(delta>Math.PI)delta-=TAU;\n  while(delta< -Math.PI)delta+=TAU;\n  this.heading+=delta*smooth;\n  this.player.position.set(this.playerX,.09,this.playerZ);\n  this.player.rotation.y=this.heading;\n  this.player.rotation.z=lerp(this.player.rotation.z,0,smooth);\n  this.playerShield.visible=false;\n  this.keyEffects.visible=false;\n  for(const bot of this.bots)this.stepBot(bot,dt);\n }\n private stepPlayer(dt:number){`,'Finiş sonrası pist turu');

if(!ui.includes('const [error,setError]') || !ui.includes('ambience.current?.mute(true)') || !ui.includes('endOverlay'))fail('V18.1 yarış ekranı yapısı tanınmıyor. Dosyalar değiştirilmedi.');
ui=once(ui,"const [error,setError]=useState(''),[ended,setEnded]=useState<number|null>(null);",
 "const [error,setError]=useState(''),[ended,setEnded]=useState<number|null>(null);\n const [showResults,setShowResults]=useState(false); // KR-V19-RESULTS-UI\n const finishRank=useRef(1);",'Sonuç penceresi durumu');
ui=once(ui,'if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);ambience.current?.mute(true);',
 "if(finishOnce.current)return;finishOnce.current=true;setEnded(duration);setShowResults(false);sound.current?.effect('finish');",'Finiş callback');
ui=once(ui,'onHud:next=>{setHud(next);sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current||finishOnce.current);', 'onHud:next=>{setHud(next);if(!finishOnce.current)finishRank.current=next.rank;sound.current?.update(next.speed,Boolean(next.throttle),pausedRef.current);','Finiş derecesini sabitleme ve ana motor sesi');
ui=once(ui,'ambience.current?.update(next,userId,TRACK_METERS,pausedRef.current||finishOnce.current);','ambience.current?.update(next,userId,TRACK_METERS,pausedRef.current);','Finiş sonrası rakip motor sesi');
ui=once(ui,'return <section className={s.raceScreen} ref={raceRoot}>',
 "return <section className={`${s.raceScreen} ${ended!==null?s.paradeMode:''}`} ref={raceRoot}>",'Finiş sonrası sade HUD');
ui=once(ui,'{ended!==null&&<div className={s.endOverlay}><div className={s.endCard}>',
 ` {ended!==null&&<div className={s.finishNotice} role="status">\n  <span>🏁 FİNİŞ · {(ended/1000).toFixed(2)} sn</span>\n  <button type="button" onClick={()=>setShowResults(v=>!v)}>{showResults?'✕ Kapat':'🏆 Sonuçları Gör'}</button>\n </div>}\n {ended!==null&&showResults&&<div className={s.endOverlay}><div className={s.endCard}>`, 'Sonuç penceresi görünürlüğü');
ui=once(ui,'`P${hud.rank} · FİNİŞ!`','`P${finishRank.current} · FİNİŞ!`','Finiş derecesi');
ui=once(ui,'<button onClick={onExit}>{roomId?\'Lobiden ayrıl\':\'Arcade’e dön\'}</button>',
 '<button type="button" onClick={()=>setShowResults(false)}>🏎️ Araçları İzle</button>\n   <button onClick={onExit}>{roomId?\'Lobiden ayrıl\':\'Arcade’e dön\'}</button>', 'Finiş ekranından piste dönüş');

if(!snd.includes('private blip(')||!snd.includes('switch(effect){'))fail('Kart Rush sound.ts yapısı tanınmıyor.');
snd=once(snd,' private blip(frequency:number,duration:number,wave:OscillatorType,amount:number,endFrequency?:number){',
 ` // KR-V19-RICH-SFX — short, layered local synthesis; no downloads or new AudioContext.\n private tone(from:number,to:number,start:number,duration:number,level:number,wave:OscillatorType='sine'){\n  const ctx=this.ctx,output=this.output;if(!ctx||!output||this.destroyed)return;\n  const at=ctx.currentTime+start;\n  const osc=ctx.createOscillator(),gain=ctx.createGain();\n  osc.type=wave;osc.frequency.setValueAtTime(Math.max(25,from),at);\n  osc.frequency.exponentialRampToValueAtTime(Math.max(25,to),at+duration);\n  gain.gain.setValueAtTime(.0001,at);\n  gain.gain.exponentialRampToValueAtTime(Math.max(.001,level),at+Math.min(.035,duration*.25));\n  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);\n  osc.connect(gain);gain.connect(output);osc.start(at);osc.stop(at+duration+.01);\n  osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch{}};\n }\n private sweep(duration:number,low:number,high:number,level:number){\n  const ctx=this.ctx,output=this.output;if(!ctx||!output||this.destroyed)return;\n  const samples=Math.max(1,Math.floor(ctx.sampleRate*duration));\n  const buffer=ctx.createBuffer(1,samples,ctx.sampleRate);\n  const data=buffer.getChannelData(0);for(let i=0;i<samples;i++)data[i]=Math.random()*2-1;\n  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();\n  const now=ctx.currentTime;src.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;\n  filter.frequency.setValueAtTime(low,now);filter.frequency.exponentialRampToValueAtTime(high,now+duration);\n  gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(level,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);\n  src.connect(filter);filter.connect(gain);gain.connect(output);src.start(now);src.stop(now+duration);\n  src.onended=()=>{try{src.disconnect();filter.disconnect();gain.disconnect();}catch{}};\n }\n private richEffect(effect:Effect){\n  if(!this.ctx||!this.output||this.volume<=0)return;\n  switch(effect){\n   case 'turbo':this.sweep(.54,330,2000,.10);this.tone(140,590,0,.51,.10,'sawtooth');break;\n   case 'shield':this.tone(350,850,0,.49,.075,'sine');this.tone(610,1050,.10,.40,.055,'triangle');break;\n   case 'emp':this.sweep(.38,2200,95,.16);this.tone(570,52,0,.48,.11,'sawtooth');break;\n   case 'pulse':this.sweep(.46,140,1400,.14);this.tone(90,510,0,.35,.09,'triangle');break;\n   case 'repair':this.tone(440,610,0,.16,.06);this.tone(560,750,.15,.17,.06);this.tone(690,900,.30,.21,.06);break;\n   case 'magnet':this.tone(230,680,0,.42,.075);this.tone(460,260,.14,.33,.065,'triangle');break;\n   case 'rival-turbo':this.sweep(.31,600,1900,.04);break;\n   case 'rival-shield':this.tone(280,590,0,.25,.032,'sine');break;\n   case 'finish':\n    this.tone(440,440,0,.20,.09);this.tone(554,554,.18,.21,.09);\n    this.tone(659,659,.38,.22,.09);this.tone(880,880,.59,.62,.13);\n    this.sweep(.52,650,1800,.055);break;\n  }\n }\n private blip(frequency:number,duration:number,wave:OscillatorType,amount:number,endFrequency?:number){`, 'Zengin ses efektleri');
snd=once(snd,'  switch(effect){\n   case \'pickup\':',"  this.richEffect(effect);\n  switch(effect){\n   case 'pickup':",'Efekt bağlantısı');
css=css.replace(/\s*$/,'')+`\n\n${marker}\n.finishNotice{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:29;display:flex;align-items:center;justify-content:center;gap:14px;width:max-content;max-width:calc(100% - 24px);background:rgba(9,18,30,.92);color:#fff;border:1px solid rgba(245,191,89,.52);border-radius:14px;padding:10px 15px;box-shadow:0 12px 32px #0007;backdrop-filter:blur(10px);font-size:13px;font-weight:900;pointer-events:auto}\n.paradeMode .raceBottom{display:none!important}
.finishNotice span{white-space:nowrap;color:#ffd36b;font-variant-numeric:tabular-nums}.finishNotice button{background:#e6324d;border:0;border-radius:9px;color:#fff;font-weight:900;font-size:12px;padding:10px 12px;white-space:nowrap;cursor:pointer}\n@media(max-width:760px){.raceScreen .finishNotice{bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:calc(100% - 16px);gap:8px;padding:8px 9px;font-size:11px}.raceScreen .finishNotice button{font-size:10px;padding:9px 8px}}\n`;
const after={'engine.ts':eng,'KartRushTrack.tsx':ui,'sound.ts':snd,'kartRush.module.css':css};
const backup=path.join(root,'.kart-rush-backups','power-finish-v19-'+new Date().toISOString().replace(/[:.]/g,'-'));
try{
 fs.mkdirSync(backup,{recursive:true});
 for(const name of targets)fs.writeFileSync(path.join(backup,name),before[name],'utf8');
 fs.writeFileSync(path.join(backup,'restore.json'),JSON.stringify({dir,targets},null,2),'utf8');
}catch(e){fail('Yedek oluşturulamadı: '+e.message);}
try{
 for(const name of targets){const file=path.join(dir,name),tmp=file+'.v19-tmp';try{fs.writeFileSync(tmp,after[name],'utf8');fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
}catch(e){
 for(const name of targets){try{fs.writeFileSync(path.join(dir,name),before[name],'utf8');}catch{}}
 fail('Dosya yazma hatası: '+e.message+' (otomatik geri alma denendi)');
}
console.log('\n✅ Kart Rush V19 ses + finiş geçişi yüklendi.');
console.log('• Turbo, EMP, kalkan, pulse, onarım ve mıknatıs için zengin sesler');
console.log('• Yakındaki botların turbo/kalkan efektleri');
console.log('• Finiş sonuçları sabit kalır; araçlar pistte devam eder');
console.log('• Yarışın üstünde ufak sonuç bandı; Sonuçları Gör / Araçları İzle');
console.log('• Orijinal dosyalar yedeklendi:',backup);
console.log('Sonraki komut: npm.cmd run build -- --webpack');
