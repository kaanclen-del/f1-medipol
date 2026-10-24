"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Header from "@/components/Header";

type Article = {
  id: string;
  week_label: string;
  title: string;
  summary: string;
  content: string;
  image_url: string | null;
  image_path: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

const emptyForm = {
  id: "", weekLabel: "", title: "", summary: "", content: "",
  imageUrl: "", imagePath: "", isPublished: false,
};

export default function WeeklyCommentaryAdmin() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch("/api/admin/weekly-commentary", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İçerikler alınamadı.");
      setArticles(json.articles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function edit(article: Article) {
    setForm({ id: article.id, weekLabel: article.week_label, title: article.title,
      summary: article.summary, content: article.content, imageUrl: article.image_url ?? "",
      imagePath: article.image_path ?? "", isPublished: article.is_published });
    setError(""); setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true); setError(""); setSuccess("");
    try {
      const data = new FormData(); data.append("file", file);
      const res = await fetch("/api/admin/weekly-commentary/upload", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Görsel yüklenemedi.");
      setForm(current => ({ ...current, imageUrl: json.url, imagePath: json.path }));
      setSuccess("Görsel yüklendi. Yazıyı kaydettiğinde yayında kullanılacak.");
    } catch (err) { setError(err instanceof Error ? err.message : "Görsel yüklenemedi."); }
    finally { setUploading(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/weekly-commentary", {
        method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kaydetme hatası.");
      const updated = json.article as Article;
      edit(updated);
      setSuccess("Kaydedildi. " + (updated.is_published ? "Yorum yayında." : "Yorum taslak olarak saklanıyor."));
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Kaydetme hatası."); }
    finally { setBusy(false); }
  }

  async function remove(article: Article) {
    if (!window.confirm(`“${article.title}” adlı yazıyı silmek istiyor musun?`)) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/weekly-commentary", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: article.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Silinemedi.");
      if (form.id === article.id) setForm({ ...emptyForm });
      setSuccess("Yorum silindi."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Silinemedi."); }
    finally { setBusy(false); }
  }

  return <>
    <Header />
    <main className="weekly-admin">
      <style>{styles}</style>
      <div className="wa-wrap">
        <nav className="wa-nav"><Link href="/admin">← YÖNETİM PANELİ</Link><Link href="/#haftalik-yorum">ANA SAYFADA GÖR →</Link></nav>
        <div className="wa-intro"><span>F1 SOCIAL / CONTENT STUDIO</span>
          <h1>Haftalık Yorum</h1><p>Yönetim Kurulu Üyemiz İdil Boyalı'nın analizini yayınla, görsel ekle ve önceki yazıları yönet.</p>
        </div>
        {error && <div className="wa-alert err" role="alert">{error}</div>}
        {success && <div className="wa-alert ok" role="status">{success}</div>}
        <div className="wa-layout">
          <form className="wa-form" onSubmit={save}>
            <div className="wa-subheading"><strong>{form.id ? "YORUMU DÜZENLE" : "YENİ YORUM"}</strong>
              <button type="button" className="wa-secondary" onClick={() => { setForm({ ...emptyForm }); setError(""); setSuccess(""); }}>+ YENİ YAZI</button>
            </div>
            <label>Hafta / Grand Prix etiketi<input value={form.weekLabel} maxLength={120} onChange={e => setForm({ ...form, weekLabel: e.target.value })} placeholder="Örn: 2026 · Amerika GP Haftası" /></label>
            <label>Yazının başlığı<input required maxLength={180} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Bu haftanın yorumu..." /></label>
            <label>Quick Intel'de görünecek kısa özet <span>(en fazla 400 karakter)</span>
              <textarea rows={3} maxLength={400} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Ana sayfanın üst panelinde görünecek kısa açıklama." /></label>
            <label>Uzun yorum metni<textarea required rows={13} maxLength={20000} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="İdil Boyalı'nın haftalık yorumu..." /></label>
            <div className="wa-image-block"><strong>YAZI GÖRSELİ</strong>
              <p>JPG / PNG / WEBP, en fazla 5 MB. Yüklediğin görsel uzun yorumun yanında görünür.</p>
              {form.imageUrl && <img className="wa-preview" src={form.imageUrl} alt="Yüklü yorum görseli" />}
              <div className="wa-inline"><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
                {form.imageUrl && <button type="button" className="wa-secondary" onClick={() => setForm({ ...form, imageUrl: "", imagePath: "" })}>Görseli kaldır</button>}
              </div>{uploading && <small>Görsel yükleniyor…</small>}
            </div>
            <label className="wa-publish"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} />
              <div><strong>Ana sayfada yayımla</strong><small>En son yayımlanan yazı üst sayfada görünür. Taslaklar görünmez.</small></div>
            </label>
            <button className="wa-save" disabled={busy || uploading || loading} type="submit">{busy ? "KAYDEDİLİYOR..." : form.id ? "DEĞİŞİKLİKLERİ KAYDET →" : "YENİ YORUMU KAYDET →"}</button>
          </form>
          <aside className="wa-archive"><div className="wa-subheading"><strong>YAZI ARŞİVİ</strong><span>{articles.length} KAYIT</span></div>
            {loading ? <p>Yazılar yükleniyor...</p> : articles.length === 0 ? <p>Henüz haftalık yorum eklenmemiş.</p> :
              articles.map(article => <article className="wa-entry" key={article.id}>
                <div className="wa-entry-head"><span className={article.is_published ? "wa-live" : "wa-draft"}>{article.is_published ? "● YAYINDA" : "TASLAK"}</span>
                  <small>{article.week_label || "HAFTALIK"}</small></div>
                <h3>{article.title}</h3><p>{article.summary || article.content.slice(0, 120)}</p>
                <div className="wa-actions"><button type="button" disabled={busy} onClick={() => edit(article)}>DÜZENLE →</button>
                  <button type="button" disabled={busy} className="wa-delete" onClick={() => { void remove(article); }}>SİL</button></div>
              </article>)}
          </aside>
        </div>
      </div>
    </main>
  </>;
}

const styles = `
.weekly-admin { min-height:100vh; padding:28px 15px 90px; color:#f5f7fa; background:radial-gradient(circle at 85% 0%,rgba(225,6,0,.15),transparent 32%),#080b11; }
.wa-wrap { max-width:1330px; margin:auto; }
.wa-nav { display:flex; justify-content:space-between; gap:15px; margin-bottom:25px; }
.wa-nav a { color:#abb5c1; font-size:11px; font-weight:900; }
.wa-intro { margin-bottom:25px; padding:28px 30px; border:1px solid #ffffff18; border-radius:16px; background:#161c25; }
.wa-intro > span { color:#ff524b; font-size:10px; font-weight:950; letter-spacing:.12em; }
.wa-intro h1 { font-size:38px; margin:9px 0; }
.wa-intro p { max-width:740px; color:#a2aeba; font-size:13px; line-height:1.65; }
.wa-layout { display:grid; grid-template-columns:minmax(0,1.7fr) minmax(300px,.8fr); gap:17px; align-items:start; }
.wa-form,.wa-archive { padding:28px; background:#141a24; border:1px solid #ffffff16; border-radius:14px; }
.wa-subheading { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:22px; }
.wa-subheading > strong { color:#ff524b; font-size:12px; letter-spacing:.11em; }
.wa-subheading > span { font-size:10px; color:#81909c; }
.wa-form label { display:grid; gap:9px; margin-top:19px; color:#c9d2db; font-size:12px; font-weight:850; }
.wa-form label span { font-size:10px; font-weight:400; color:#80909e; }
.wa-form input:not([type=checkbox]):not([type=file]), .wa-form textarea { width:100%; padding:13px 15px; border:1px solid #ffffff23; border-radius:8px; background:#090d15; outline:none; font:inherit; font-size:13px; color:#fff; }
.wa-form input:focus,.wa-form textarea:focus { border-color:#ff5149 !important; }
.wa-form textarea { resize:vertical; line-height:1.65; }
.wa-image-block { margin-top:24px; padding:19px; border:1px solid #ffffff15; border-radius:11px; background:#ffffff06; }
.wa-image-block > strong { font-size:11px; color:#f5f7fa; }
.wa-image-block p { color:#8896a4; font-size:11px; line-height:1.6; }
.wa-image-block small { color:#ffb4a6; }
.wa-preview { width:100%; max-height:260px; object-fit:contain; background:#05070b; border-radius:9px; margin:10px 0; }
.wa-inline { display:flex; flex-wrap:wrap; align-items:center; gap:12px; }
.wa-inline input { max-width:100%; color:#a9b5bf; }
.wa-secondary { border:1px solid #ffffff28; color:#d6e0e8; padding:10px 12px; background:#ffffff0b; border-radius:8px; font-size:10px; font-weight:900; cursor:pointer; }
.wa-form .wa-publish { display:flex; align-items:center; gap:12px; padding:17px; margin-top:20px; background:#ffffff06; border:1px solid #ffffff12; border-radius:10px; cursor:pointer; }
.wa-publish input { width:19px; height:19px; accent-color:#e10600; }
.wa-publish strong,.wa-publish small { display:block; }
.wa-publish small { margin-top:5px; font-size:10px; color:#9caab4; }
.wa-save { width:100%; margin-top:19px; padding:15px; border:0; border-radius:9px; background:linear-gradient(90deg,#e10600,#fa493b); color:white; font-weight:950; font-size:12px; cursor:pointer; }
.wa-save:disabled,.wa-secondary:disabled { opacity:.55; cursor:not-allowed; }
.wa-entry { margin-top:11px; padding:17px; border:1px solid #ffffff13; border-radius:10px; background:#090d15; }
.wa-entry-head,.wa-actions { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.wa-entry-head small { color:#81909c; font-size:9px; }
.wa-live,.wa-draft { color:#61dc98; font-size:9px; font-weight:950; }
.wa-draft { color:#f0c75e; }
.wa-entry h3 { font-size:17px; margin:10px 0; }
.wa-entry p { color:#8f9ca8; line-height:1.6; font-size:11px; overflow-wrap:anywhere; }
.wa-actions { margin-top:15px; }
.wa-actions button { border:none; background:none; color:#ff5149; font-size:10px; font-weight:950; cursor:pointer; }
.wa-actions .wa-delete { color:#9caab5; }
.wa-alert { padding:13px 18px; margin-bottom:16px; border-radius:8px; font-size:12px; }
.wa-alert.err { background:#6e1b28; border:1px solid #e0445b; }
.wa-alert.ok { background:#18402d; border:1px solid #329567; }
@media(max-width:850px){ .wa-layout{grid-template-columns:1fr} }
@media(max-width:550px){ .wa-form,.wa-archive{padding:18px} .wa-intro{padding:21px} .wa-intro h1{font-size:29px} }
`;
