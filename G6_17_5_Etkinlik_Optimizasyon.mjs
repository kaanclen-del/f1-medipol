import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('app/events/page.tsx');
if (!fs.existsSync(file)) {
  console.error('HATA: Bu komut proje ana klasöründe çalıştırılmalı. app/events/page.tsx bulunamadı.');
  process.exitCode = 1;
} else {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes('loadPublishedEvents')) {
    console.log('Etkinlik optimizasyonu bu dosyada zaten uygulanmış.');
  } else {
    const block = /  const supabase\s*=\s*await createClient\(\);\s*const \{\s*data,\s*\}\s*=\s*await supabase\s*\.from\(\s*"events"\s*\)[\s\S]*?\.order\(\s*"start_at",\s*\{\s*ascending:\s*false,?\s*\}\s*\);\s*const events\s*=\s*\(data \?\? \[\]\) as EventRow\[\];/;
    if (!block.test(source)) {
      console.error('HATA: Etkinlik kodu beklenen biçimde değil. Dosya değiştirilmedi; mevcut sürümü göndermen gerekiyor.');
      process.exitCode = 1;
    } else {
      const backup = file + '.before-g6175.bak';
      if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
      source = source.replace(block, '  const events = (await loadPublishedEvents()) as EventRow[];');
      source = source.replace('import { createClient } from "@/utils/supabase/server";', 'import { loadPublishedEvents } from "@/lib/public-events-cache";');
      // Browsers should not decode below-the-fold images until needed.
      source = source.replace(/(<img\s*\n\s*src=\{\s*featuredEvent\.cover_image_url\s*\})/, '$1\n                  fetchPriority="high"\n                  decoding="async"');
      source = source.replace(/(<img\s*\n\s*src=\{event\.cover_image_url\})/, '$1\n                            decoding="async"');
      fs.writeFileSync(file, source, 'utf8');
      console.log('Etkinlikler optimize edildi. Önceki sürüm yedeği: app/events/page.tsx.before-g6175.bak');
    }
  }
}
