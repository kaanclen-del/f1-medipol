/* F1 Medipol Kart Rush — Minimal ana menu
 * Run from Next.js project ROOT:
 *   node .\kart-rush-sade-menu\INSTALL.cjs
 *   node .\kart-rush-sade-menu\INSTALL.cjs --force
 * Only updates components/kart-rush/KartRushClient.tsx and kartRush.module.css.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.cwd();
const srcFolder = path.join(root, 'components', 'kart-rush');
const srcCode = path.join(srcFolder, 'KartRushClient.tsx');
const srcCSS = path.join(srcFolder, 'kartRush.module.css');
const pkg = path.join(root, 'package.json');
const manifest = require('./hashes.json');

const marker = '/* ===== F1 MEDIPOL | SADE ANA MENU (V14 / V15) =====';
const forceMarker = '/* ===== F1 MEDIPOL | MENU GENISLETME + EK GUCLER ===== */';
const force = process.argv.includes('--force');

const sha = (s) =>
  crypto.createHash('sha256').update(String(s).replace(/\r\n/g, '\n')).digest('hex');

const fail = (s) => {
  console.error('\n❌ İŞLEM DURDU: ' + s);
  process.exit(1);
};

if (!fs.existsSync(pkg) || !fs.existsSync(srcCode) || !fs.existsSync(srcCSS)) {
  fail(
    'VS Code terminalini F1 Medipol projesinin ana klasöründe aç. package.json ve components/kart-rush dosyaları bulunmalı.'
  );
}

let originalCode = fs.readFileSync(srcCode, 'utf8');
let originalCSS = fs.readFileSync(srcCSS, 'utf8');

const versionFromHash = Object.entries(manifest).find(([ver, entry]) => {
  return (
    sha(originalCode) === entry.source['KartRushClient.tsx'] ||
    sha(originalCode) === entry.target['KartRushClient.tsx']
  );
});

const version =
  versionFromHash?.[0] ||
  (originalCode.includes('FINAL EDITION 15') ? 'v15' : 'v14');

const base = path.join(__dirname, 'surumler', version);
const nextCodeFile = path.join(base, 'KartRushClient.tsx');
const nextCSSFile = path.join(base, 'kartRush.module.css');

if (!fs.existsSync(nextCodeFile) || !fs.existsSync(nextCSSFile)) {
  fail('Paket eksik veya yanlış açılmış.');
}

const targetCode = fs.readFileSync(nextCodeFile, 'utf8');
const targetCSS = fs.readFileSync(nextCSSFile, 'utf8');

if (
  sha(targetCode) !== manifest[version].target['KartRushClient.tsx'] ||
  sha(targetCSS) !== manifest[version].target['kartRush.module.css']
) {
  fail('Paket dosyaları doğrulanamadı. ZIP dosyasını yeniden aç.');
}

const getRange = (text, start, end) => {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || a >= b) {
    throw Error('Beklenen JSX bölümü bulunamadı: ' + start);
  }
  return text.slice(a, b);
};

const startHome = "   {menuTab==='home'&&<div className={s.menuHome}>";
const nextGarage = "   {menuTab==='garage'&&";
const startPace = "     <div className={s.settingsGroup}><h3>YARIŞ TEMPOSU</h3>";
const nextBot = "     <div className={s.settingsGroup}><h3>BOT ZORLUĞU</h3>";

let newCode = originalCode;
let newCSS = originalCSS;

if (force) {
  newCode = targetCode;
  newCSS = targetCSS;
} else {
  if (sha(originalCode) === manifest[version].source['KartRushClient.tsx']) {
    newCode = targetCode;
  } else if (sha(originalCode) !== manifest[version].target['KartRushClient.tsx']) {
    try {
      if (!newCode.includes('YARIŞ AYARLARI')) {
        const oldHome = getRange(newCode, startHome, nextGarage);
        if (
          !oldHome.includes('launchConfigGrid') &&
          !oldHome.includes('practiceBtn')
        ) {
          fail(
            'Mevcut menü beklenen V14/V15 yapısında değil; yerel değişikliklerin üzerine yazılmadı.'
          );
        }
        const newHome = getRange(targetCode, startHome, nextGarage);
        newCode = newCode.replace(oldHome, newHome);
      }

      newCode = newCode.replace(
        /^\s*<div className=\{s\.eyebrow\}>F1 MEDİPOL \/ ARCADE EXPERIENCE \/ 2026<\/div>\r?\n/m,
        '\n'
      );
      newCode = newCode.replace(
        /<div className=\{s\.launchHeroLabel\}>GRAND PRIX <strong>(EDITION 14|FINAL EDITION 15)<\/strong><\/div>/,
        ''
      );

      if (!newCode.includes('YARIŞ TEMPOSU')) {
        if (!newCode.includes(nextBot)) {
          fail('Ayarlar bölümüne ulaşılamadı; işlem yapılmadı.');
        }
        const pace = getRange(targetCode, startPace, nextBot);
        newCode = newCode.replace(nextBot, pace + nextBot);
      }
    } catch (e) {
      fail(e.message);
    }
  }

  if (sha(originalCSS) === manifest[version].source['kartRush.module.css']) {
    newCSS = targetCSS;
  } else {
    const suffixStart = targetCSS.indexOf(marker);
    if (suffixStart < 0) fail('CSS eklentisi bulunamadı.');
    const suffix = targetCSS.slice(suffixStart);

    if (!newCSS.includes(marker)) {
      newCSS = newCSS.trimEnd() + '\n\n' + suffix;
    } else if (!newCSS.includes(forceMarker)) {
      const forceStart = targetCSS.indexOf(forceMarker);
      if (forceStart >= 0) {
        const forceSuffix = targetCSS.slice(forceStart);
        newCSS = newCSS.trimEnd() + '\n\n' + forceSuffix;
      }
    }
  }
}

if (!newCode.includes('YARIŞ AYARLARI')) {
  fail('Dosyalar hazırlanamıyor, KartRushClient.tsx güncellenmedi.');
}
if (!newCSS.includes(marker)) {
  fail('Dosyalar hazırlanamıyor, CSS güncellenmedi.');
}
if (!newCSS.includes(forceMarker)) {
  fail('Yeni genişletme / ek güçler CSS bloğu bulunamadı.');
}

if (sha(originalCode) === sha(newCode) && sha(originalCSS) === sha(newCSS)) {
  console.log('✅ Güncel sade menü zaten kurulu. Hiçbir değişiklik yapılmadı.');
  process.exit(0);
}

const backup = path.join(
  root,
  '.kart-rush-backups',
  'sade-menu-' + new Date().toISOString().replace(/[:.]/g, '-')
);

fs.mkdirSync(backup, { recursive: true });
fs.copyFileSync(srcCode, path.join(backup, 'KartRushClient.tsx'));
fs.copyFileSync(srcCSS, path.join(backup, 'kartRush.module.css'));
fs.writeFileSync(
  path.join(backup, 'backup-index.json'),
  JSON.stringify({ version, root, createdAt: new Date().toISOString(), force }, null, 2)
);

const touched = [];
try {
  for (const [target, code] of [
    [srcCode, newCode],
    [srcCSS, newCSS],
  ]) {
    const temp = target + '.kr-menu-tmp';
    fs.writeFileSync(temp, code, 'utf8');
    fs.renameSync(temp, target);
    touched.push(target);
  }
} catch (e) {
  for (const target of touched) {
    fs.copyFileSync(path.join(backup, path.basename(target)), target);
  }
  fail('Dosyalar yazılamadı, yedekten geri yüklendi. ' + e.message);
}

console.log('\n✅ KART RUSH — GENİŞLETİLMİŞ SADE ANA MENÜ KURULDU (' + version.toUpperCase() + ')');
console.log('Değişenler: KartRushClient.tsx, kartRush.module.css');
console.log('Eklenenler: genişletilmiş sol alan + 6 özel güç kartı');
console.log('Korunanlar: pist, yarış motoru, Supabase, lobby, HUD ve tüm diğer dosyalar.');
console.log('Yedek: ' + backup);
console.log('\nKontrol: npm.cmd run dev -- --webpack');
console.log('Sayfa: http://localhost:3000/arcade/kart-rush');