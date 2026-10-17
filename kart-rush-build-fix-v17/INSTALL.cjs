'use strict';
/* F1 Medipol Kart Rush build fix: no source overwrite, no guessed constants.
   Run from Next.js project root: node .\kart-rush-build-fix-v17\INSTALL.cjs */
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const die = message => { console.error('\n❌ DÜZELTME DURDU: ' + message); process.exit(1); };
const exists = p => fs.existsSync(p);
const read = p => fs.readFileSync(p, 'utf8');

if (!exists(path.join(root, 'package.json'))) die('Terminali package.json bulunan f1-medipol proje klasöründe aç.');
const srcRoot = exists(path.join(root, 'components', 'kart-rush', 'KartRushTrack.tsx')) ? root
 : exists(path.join(root, 'src', 'components', 'kart-rush', 'KartRushTrack.tsx')) ? path.join(root, 'src') : null;
if (!srcRoot) die('components/kart-rush/KartRushTrack.tsx bulunamadı.');
const lib = path.join(srcRoot, 'components', 'kart-rush');
const trackFile = path.join(lib, 'KartRushTrack.tsx');
const engineFile = path.join(lib, 'engine.ts');
const circuitFile = path.join(lib, 'circuit.ts');
const configFile = path.join(root, 'tsconfig.json');
if (!exists(engineFile)) die('Kart Rush engine.ts bulunamadı; dosyalar değiştirilmedi.');
if (!exists(configFile)) die('tsconfig.json bulunamadı; dosyalar değiştirilmedi.');

const originalTrack = read(trackFile);
const originalEngine = read(engineFile);
const originalConfig = read(configFile);
let track = originalTrack;
let engine = originalEngine;
let config = originalConfig;
const notes = [];

const fromEngine = /import\s*\{\s*TRACK_METERS\s*,\s*trackPosition\s*\}\s*from\s*(['"])\.\/engine\1\s*;?/;
const reverseEngine = /import\s*\{\s*trackPosition\s*,\s*TRACK_METERS\s*\}\s*from\s*(['"])\.\/engine\1\s*;?/;
const localDecl = /^([ \t]*)(const|let)\s+TRACK_METERS\s*=/m;
const exported = /\bexport\s+(?:const|let)\s+TRACK_METERS\b|\bexport\s*\{[^}]*\bTRACK_METERS\b[^}]*\}/s;
const circuit = exists(circuitFile) ? read(circuitFile) : '';
const circuitHasMeters = /\bexport\s+(?:const|let)\s+TRACK_METERS\b|\bexport\s*\{[^}]*\bTRACK_METERS\b[^}]*\}/s.test(circuit);
const circuitHasPosition = /\bexport\s+(?:const|function)\s+trackPosition\b|\bexport\s*\{[^}]*\btrackPosition\b[^}]*\}/s.test(circuit);

let trackImport = fromEngine.exec(track) || reverseEngine.exec(track);
const engineExportsMeters = exported.test(engine);
if (trackImport && !engineExportsMeters) {
  if (circuitHasMeters && circuitHasPosition) {
    track = track.replace(trackImport[0], "import { TRACK_METERS, trackPosition } from './circuit';");
    notes.push('TRACK_METERS ve trackPosition doğrudan circuit.ts dosyasından alınıyor.');
  } else if (circuitHasMeters) {
    track = track.replace(trackImport[0], "import { TRACK_METERS } from './circuit';\nimport { trackPosition } from './engine';");
    notes.push('TRACK_METERS circuit.ts dosyasından alınıyor.');
  } else if (localDecl.test(engine)) {
    engine = engine.replace(localDecl, '$1export $2 TRACK_METERS =');
    notes.push('Var olan TRACK_METERS sabiti engine.ts üzerinden dışa açıldı.');
  } else {
    // Last resort: compute the actual route length from engine's exported geometry,
    // rather than introducing a guessed track distance or editing the 3D physics.
    const derived = `import { trackPosition } from './engine';
// Route length derived once from the existing track geometry (no guessed distance).
const TRACK_METERS = (() => {
  let length = 0;
  let previous = trackPosition(0);
  for (let i = 1; i <= 512; i++) {
    const next = trackPosition(i / 512);
    length += Math.hypot(next.x - previous.x, next.z - previous.z);
    previous = next;
  }
  return length;
})();`;
    track = track.replace(trackImport[0], derived);
    notes.push('Pist uzunluğu engine.ts içindeki gerçek rota koordinatlarından türetiliyor.');
  }
} else if (trackImport && engineExportsMeters) {
  notes.push('TRACK_METERS zaten dışa aktarılıyor; mevcut import korunuyor.');
} else if (/import\s*\{[^}]*TRACK_METERS[^}]*\}\s*from\s*['"]\.\/circuit['"]/.test(track) && circuitHasMeters) {
  notes.push('TRACK_METERS zaten circuit.ts dosyasından alınıyor.');
} else if (track.includes('// Route length derived once from the existing track geometry') && /const\s+TRACK_METERS\s*=/.test(track)) {
  notes.push('Pist uzunluğu zaten rota koordinatlarından türetiliyor.');
} else if (/\bTRACK_METERS\b/.test(track)) {
  die('TRACK_METERS farklı bir import yapısında. Bilinmeyen kodu değiştirmedim.');
} else {
  notes.push('KartRushTrack.tsx içinde TRACK_METERS kullanımı yok.');
}

// Keep installer backups, but prevent TypeScript from compiling their example TSX files.
const excludedFolder = 'kart-rush-sade-menu';
if (exists(path.join(root, excludedFolder))) {
  const exclusion = /"exclude"\s*:\s*\[/g;
  const match = exclusion.exec(config);
  if (match) {
    const bracketOpen = match.index + match[0].length - 1;
    let bracketClose = -1;
    let inQuote = false, esc = false, quote = '';
    for (let i = bracketOpen + 1; i < config.length; i++) {
      const c = config[i];
      if (inQuote) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === quote) inQuote = false; continue; }
      if (c === '"' || c === "'") { inQuote = true; quote = c; continue; }
      if (c === ']') { bracketClose = i; break; }
    }
    if (bracketClose === -1) die('tsconfig.json exclude dizisi kapatılamadı; hiçbir dosya değiştirilmedi.');
    const entries = config.slice(bracketOpen + 1, bracketClose);
    if (!/['"]kart-rush-sade-menu['"]/.test(entries)) {
      const trimmed = entries.trim();
      const comma = trimmed && !trimmed.endsWith(',') ? ',' : '';
      const insertion = `${comma}${trimmed ? '\n    ' : ''}"${excludedFolder}"`;
      config = config.slice(0, bracketClose) + insertion + config.slice(bracketClose);
      notes.push('tsconfig.json exclude listesine kart-rush-sade-menu eklendi.');
    }
  } else {
    const start = config.indexOf('{');
    if (start < 0) die('tsconfig.json geçerli JSON nesnesi değil; hiçbir dosya değiştirilmedi.');
    config = config.slice(0, start + 1) + '\n  "exclude": ["node_modules", "kart-rush-sade-menu"],\n' + config.slice(start + 1);
    notes.push('tsconfig.json içine exclude listesi eklendi.');
  }
} else {
  notes.push('kart-rush-sade-menu klasörü bulunmadı; tsconfig değiştirilmedi.');
}

const changes = [
  [trackFile, originalTrack, track],
  [engineFile, originalEngine, engine],
  [configFile, originalConfig, config]
].filter(([,before,after]) => before !== after);
if (!changes.length) {
  console.log('\n✅ Derleme düzeltmesi zaten uygulanmış; dosyalara dokunulmadı.');
  for (const item of notes) console.log('• ' + item);
  process.exit(0);
}

const backup = path.join(root, '.kart-rush-backups', 'build-fix-v17-' + new Date().toISOString().replace(/[:.]/g, '-'));
try {
  fs.mkdirSync(backup, {recursive:true});
  const manifest=[];
  for (const [target, before] of changes) {
    const name = path.basename(target);
    fs.writeFileSync(path.join(backup, name), before, 'utf8');
    manifest.push({target, backup:name});
  }
  fs.writeFileSync(path.join(backup, 'restore.json'), JSON.stringify(manifest, null, 2));
} catch (e) { die('Yedek alınamadı: ' + e.message); }

try {
  for (const [target, , after] of changes) {
    const temp = target + '.buildfix-tmp';
    try { fs.writeFileSync(temp, after, 'utf8'); fs.renameSync(temp, target); }
    finally { if (exists(temp)) fs.unlinkSync(temp); }
  }
} catch (e) {
  for (const [target, before] of changes) { try {fs.writeFileSync(target, before, 'utf8');} catch {} }
  die('Kurulum hatası nedeniyle önceki dosyalar geri yüklendi: ' + e.message);
}
console.log('\n✅ KART RUSH DERLEME DÜZELTMESİ V17 KURULDU');
for (const item of notes) console.log('• ' + item);
console.log('Yedek:', backup);
console.log('Şimdi çalıştır: npm.cmd run build -- --webpack');
