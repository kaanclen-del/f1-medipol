"use client";

import { useCallback, useEffect, useState } from "react";

type SocialLink = {
  id: number;
  label: string;
  url: string;
  icon: string;
  sort_order: number;
  is_visible: boolean;
};

const iconOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "link", label: "Diğer bağlantı" },
];

const emptyForm = {
  label: "",
  url: "",
  icon: "link",
  sort_order: 0,
  is_visible: true,
};

export default function AdminSocialLinks() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/social-links", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Bağlantılar yüklenemedi.");
      }

      setLinks(Array.isArray(result.links) ? result.links : []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bağlantılar yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/social-links", {
        method: editingId === null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId === null ? form : { ...form, id: editingId }
        ),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Kayıt yapılamadı.");
      }

      setMessage(editingId === null ? "Bağlantı eklendi." : "Bağlantı güncellendi.");
      resetForm();
      await loadLinks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt yapılamadı.");
    } finally {
      setSaving(false);
    }
  }

  function editLink(link: SocialLink) {
    setEditingId(link.id);
    setForm({
      label: link.label,
      url: link.url,
      icon: link.icon,
      sort_order: link.sort_order,
      is_visible: link.is_visible,
    });
    setMessage("");
  }

  async function updateLink(id: number, updates: Partial<SocialLink>) {
    setMessage("");

    try {
      const response = await fetch("/api/admin/social-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Güncelleme başarısız.");
      }

      await loadLinks();
      setMessage("Değişiklik kaydedildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Güncelleme başarısız.");
    }
  }

  async function deleteLink(link: SocialLink) {
    if (!window.confirm(`"${link.label}" bağlantısı silinsin mi?`)) return;

    setMessage("");

    try {
      const response = await fetch("/api/admin/social-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: link.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Silme işlemi başarısız.");
      }

      if (editingId === link.id) resetForm();
      await loadLinks();
      setMessage("Bağlantı silindi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Silme işlemi başarısız.");
    }
  }

  return (
    <section className="social-admin">
      <style>{`
        .social-admin {
          margin: 18px 0;
          padding: 24px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 15px;
          background: linear-gradient(145deg,#1b2029,#11151b);
          color: #f5f6f8;
        }
        .social-admin h2 { margin: 0 0 6px; font-size: 23px; font-weight: 850; }
        .social-admin p { color: #9ca6b4; font-size: 12px; line-height: 1.6; }
        .social-admin-form {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 12px;
          margin: 20px 0 25px;
        }
        .social-admin-field { display: grid; gap: 6px; min-width: 0; }
        .social-admin-field label { color: #c3cbd5; font-size: 11px; font-weight: 750; }
        .social-admin-field input, .social-admin-field select {
          width: 100%; min-height: 42px; padding: 9px 11px;
          border: 1px solid rgba(255,255,255,.14); border-radius: 8px;
          background: #0d1117; color: #fff; font: inherit; font-size: 12px;
        }
        .social-admin-checkbox {
          display: flex; align-items: center; gap: 9px;
          color: #d5dbe3; font-size: 12px;
        }
        .social-admin-checkbox input { accent-color: #e10600; }
        .social-admin-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .social-admin-button {
          min-height: 38px; padding: 8px 12px; border: 1px solid rgba(255,255,255,.15);
          border-radius: 8px; background: rgba(255,255,255,.06); color: #fff;
          cursor: pointer; font-size: 11px; font-weight: 800;
        }
        .social-admin-button.primary { border-color: #e10600; background: #e10600; }
        .social-admin-button.danger { color: #ff8883; }
        .social-admin-button:disabled { opacity: .55; cursor: not-allowed; }
        .social-admin-list { display: grid; gap: 9px; }
        .social-admin-row {
          display: grid; grid-template-columns: minmax(0,1fr) auto;
          gap: 12px; align-items: center; padding: 14px;
          border: 1px solid rgba(255,255,255,.1); border-radius: 10px;
          background: rgba(0,0,0,.16);
        }
        .social-admin-row strong { display: block; overflow-wrap: anywhere; font-size: 13px; }
        .social-admin-row small { display: block; margin-top: 4px; color: #929dad; overflow-wrap: anywhere; font-size: 10px; }
        .social-admin-status { margin: 12px 0; color: #ffb0ac; font-size: 12px; }
        .social-admin-muted { color: #929dad; font-size: 12px; }
        @media(max-width:650px) {
          .social-admin { padding: 16px; }
          .social-admin-form { grid-template-columns: 1fr; }
          .social-admin-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <h2>Sosyal Medya Bağlantıları</h2>
      <p>
        Footer alanında görünecek bağlantıları buradan yönetin. Eklediğiniz
        bağlantılar kaydedildiğinde sitede otomatik güncellenir.
      </p>

      <form className="social-admin-form" onSubmit={submitForm}>
        <div className="social-admin-field">
          <label htmlFor="social-label">Görünen ad</label>
          <input
            id="social-label"
            required
            maxLength={40}
            value={form.label}
            placeholder="Örn. Instagram"
            onChange={(event) => setForm({ ...form, label: event.target.value })}
          />
        </div>

        <div className="social-admin-field">
          <label htmlFor="social-url">Bağlantı adresi</label>
          <input
            id="social-url"
            type="url"
            required
            maxLength={500}
            value={form.url}
            placeholder="https://..."
            onChange={(event) => setForm({ ...form, url: event.target.value })}
          />
        </div>

        <div className="social-admin-field">
          <label htmlFor="social-icon">Platform / ikon</label>
          <select
            id="social-icon"
            value={form.icon}
            onChange={(event) => setForm({ ...form, icon: event.target.value })}
          >
            {iconOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="social-admin-field">
          <label htmlFor="social-order">Sıralama (küçük sayı önce)</label>
          <input
            id="social-order"
            type="number"
            value={form.sort_order}
            onChange={(event) =>
              setForm({ ...form, sort_order: Number(event.target.value) || 0 })
            }
          />
        </div>

        <label className="social-admin-checkbox">
          <input
            type="checkbox"
            checked={form.is_visible}
            onChange={(event) =>
              setForm({ ...form, is_visible: event.target.checked })
            }
          />
          Footer'da görünür
        </label>

        <div className="social-admin-actions">
          <button className="social-admin-button primary" disabled={saving} type="submit">
            {saving ? "Kaydediliyor..." : editingId === null ? "Bağlantı Ekle" : "Değişiklikleri Kaydet"}
          </button>
          {editingId !== null && (
            <button className="social-admin-button" type="button" onClick={resetForm}>
              Düzenlemeyi İptal Et
            </button>
          )}
        </div>
      </form>

      {message && <div className="social-admin-status" role="status">{message}</div>}

      <div className="social-admin-list">
        {loading ? (
          <div className="social-admin-muted">Bağlantılar yükleniyor...</div>
        ) : links.length === 0 ? (
          <div className="social-admin-muted">Henüz bağlantı eklenmemiş.</div>
        ) : (
          links.map((link) => (
            <div className="social-admin-row" key={link.id}>
              <div>
                <strong>
                  {link.label} · {link.is_visible ? "Yayında" : "Gizli"}
                </strong>
                <small>{link.url}</small>
                <small>İkon: {link.icon} · Sıra: {link.sort_order}</small>
              </div>

              <div className="social-admin-actions">
                <button className="social-admin-button" type="button" onClick={() => editLink(link)}>
                  Düzenle
                </button>
                <button
                  className="social-admin-button"
                  type="button"
                  onClick={() => void updateLink(link.id, { is_visible: !link.is_visible })}
                >
                  {link.is_visible ? "Gizle" : "Yayınla"}
                </button>
                <button
                  className="social-admin-button"
                  type="button"
                  onClick={() => void updateLink(link.id, { sort_order: link.sort_order - 1 })}
                  aria-label={`${link.label} sırasını yukarı al`}
                >
                  ↑
                </button>
                <button
                  className="social-admin-button"
                  type="button"
                  onClick={() => void updateLink(link.id, { sort_order: link.sort_order + 1 })}
                  aria-label={`${link.label} sırasını aşağı al`}
                >
                  ↓
                </button>
                <button className="social-admin-button danger" type="button" onClick={() => void deleteLink(link)}>
                  Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
