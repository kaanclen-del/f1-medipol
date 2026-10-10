
"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  ACHIEVEMENT_CONDITIONS,
  ACHIEVEMENT_CONDITION_LABELS,
} from "@/lib/achievement-conditions";

type Achievement = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  rarity: string;
  xp_reward: number;
  is_automatic: boolean;
  condition_type: string;
  condition_value: number | null;
  is_published: boolean;
  sort_order: number;
  award_count: number;
};

type UserResult = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type UserAward = {
  id: string;
  achievement_id: string;
  award_source: string;
  awarded_at: string;
  xp_awarded?: number;
  achievement: Achievement | null;
};

const CONDITIONS: Record<string, string> =
  ACHIEVEMENT_CONDITION_LABELS;

const GROUPS = [
  { value: "paddock", label: "PADDOCK" },
  { value: "prediction", label: "TAHMİNLER" },
  { value: "profile", label: "PROFİL" },
] as const;

function emptyForm() {
  return {
    name: "",
    description: "",
    imageUrl: "",
    category: "achievement",
    rarity: "common",
    xpReward: "50",
    isAutomatic: false,
    conditionType: "manual",
    conditionValue: "1",
    isPublished: true,
    sortOrder: "0",
  };
}

export default function AdminAchievementManager() {
  const [achievements, setAchievements] =
    useState<Achievement[]>([]);

  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [users, setUsers] = useState<UserResult[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] =
    useState<UserResult | null>(null);
  const [selectedAchievementId, setSelectedAchievementId] =
    useState("");
  const [userAwards, setUserAwards] = useState<UserAward[]>([]);
  const [awardNote, setAwardNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  async function loadAchievements() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/achievements", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Başarımlar yüklenemedi."
        );
      }

      setAchievements(data.achievements ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Başarımlar yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAchievements();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/achievements/assign?q=${encodeURIComponent(
            userQuery
          )}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (response.ok) {
          setUsers(data.users ?? []);
        }
      } catch {
        // Arama başarısız olduğunda mevcut sonuçlar korunur.
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [userQuery]);

  function setField(
    key: keyof ReturnType<typeof emptyForm>,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch(
        "/api/admin/achievements/upload",
        {
          method: "POST",
          body,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setField("imageUrl", data.url);
      setMessage("✓ Görsel yüklendi.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Görsel yüklenemedi."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveAchievement() {
    setSaving(true);
    setMessage("");

    try {
      const endpoint = editingId
        ? `/api/admin/achievements/${editingId}`
        : "/api/admin/achievements";

      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          imageUrl: form.imageUrl,
          category: form.category,
          rarity: form.rarity,
          xpReward: Number(form.xpReward),
          isAutomatic: form.isAutomatic,
          conditionType: form.isAutomatic
            ? form.conditionType
            : "manual",
          conditionValue: Number(form.conditionValue),
          isPublished: form.isPublished,
          sortOrder: Number(form.sortOrder),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kaydedilemedi.");
      }

      setMessage(
        editingId
          ? "✓ Başarım güncellendi."
          : "✓ Başarım oluşturuldu."
      );

      setEditingId(null);
      setForm(emptyForm());
      await loadAchievements();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  function editAchievement(achievement: Achievement) {
    setEditingId(achievement.id);

    setForm({
      name: achievement.name,
      description: achievement.description || "",
      imageUrl: achievement.image_url || "",
      category: achievement.category,
      rarity: achievement.rarity,
      xpReward: String(achievement.xp_reward ?? 0),
      isAutomatic: achievement.is_automatic,
      conditionType: achievement.condition_type,
      conditionValue: String(
        achievement.condition_value ?? 1
      ),
      isPublished: achievement.is_published,
      sortOrder: String(achievement.sort_order),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteAchievement(achievement: Achievement) {
    if (
      !window.confirm(
        `"${achievement.name}" silinsin mi?`
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/admin/achievements/${achievement.id}`,
      { method: "DELETE" }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Silinemedi.");
      return;
    }

    setMessage("✓ Başarım silindi.");
    await loadAchievements();
  }

  async function selectUser(user: UserResult) {
    setSelectedUser(user);

    const response = await fetch(
      `/api/admin/achievements/assign?userId=${encodeURIComponent(
        user.id
      )}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (response.ok) {
      setUserAwards(data.awards ?? []);
    }
  }

  async function assignAchievement() {
    if (!selectedUser || !selectedAchievementId) {
      setMessage("Kullanıcı ve başarım seç.");
      return;
    }

    setAssigning(true);

    try {
      const response = await fetch(
        "/api/admin/achievements/assign",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            achievementId: selectedAchievementId,
            note: awardNote,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setMessage("✓ Rozet kullanıcıya verildi.");
      setAwardNote("");

      await selectUser(selectedUser);
      await loadAchievements();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Rozet verilemedi."
      );
    } finally {
      setAssigning(false);
    }
  }

  async function revokeAchievement(award: UserAward) {
    if (!selectedUser) return;

    if (!window.confirm("Rozet geri alınsın mı?")) {
      return;
    }

    const response = await fetch(
      "/api/admin/achievements/assign",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          achievementId: award.achievement_id,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error);
      return;
    }

    setMessage("✓ Rozet geri alındı.");

    await selectUser(selectedUser);
    await loadAchievements();
  }

  async function evaluateAll() {
    setEvaluating(true);

    try {
      const response = await fetch(
        "/api/admin/achievements/evaluate",
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setMessage(
        `✓ ${data.evaluated ?? 0} kullanıcı kontrol edildi.`
      );

      await loadAchievements();

      if (selectedUser) {
        await selectUser(selectedUser);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Kontrol başarısız."
      );
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="achievement-manager">
      <style>{styles}</style>

      <section className="achievement-panel">
        <div className="achievement-eyebrow">
          BADGE CREATOR
        </div>

        <h2>
          {editingId
            ? "Başarımı Düzenle"
            : "Yeni Rozet / Başarım"}
        </h2>

        <p className="panel-copy">
          Görseli, kazanma koşulunu ve vereceği XP miktarını belirle.
        </p>

        <div className="form-grid">
          <label className="field">
            Rozet Adı
            <input
              value={form.name}
              onChange={(event) =>
                setField("name", event.target.value)
              }
              placeholder="Grid Veteran"
            />
          </label>

          <label className="field xp-field">
            XP ÖDÜLÜ
            <div className="xp-input-wrap">
              <input
                type="number"
                min="0"
                max="100000"
                value={form.xpReward}
                onChange={(event) =>
                  setField("xpReward", event.target.value)
                }
              />
              <span>XP</span>
            </div>
          </label>

          <label className="field">
            Kategori
            <select
              value={form.category}
              onChange={(event) =>
                setField("category", event.target.value)
              }
            >
              <option value="achievement">Başarım</option>
              <option value="badge">Rozet</option>
              <option value="special">Özel</option>
              <option value="event">Etkinlik</option>
            </select>
          </label>

          <label className="field">
            Nadirlik
            <select
              value={form.rarity}
              onChange={(event) =>
                setField("rarity", event.target.value)
              }
            >
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </label>

          <label className="field full">
            Açıklama
            <textarea
              value={form.description}
              onChange={(event) =>
                setField("description", event.target.value)
              }
            />
          </label>

          <div className="field full">
            Rozet Görseli

            <div className="upload-row">
              <div className="image-preview">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" />
                ) : (
                  "🏆"
                )}
              </div>

              <label className="button">
                {uploading ? "Yükleniyor..." : "Görsel Yükle"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  hidden
                />
              </label>
            </div>
          </div>

          <div className="field">
            Dağıtım Tipi

            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isAutomatic}
                onChange={(event) => {
                  const checked = event.target.checked;

                  setField("isAutomatic", checked);
                  setField(
                    "conditionType",
                    checked ? "paddock_post_count" : "manual"
                  );
                }}
              />
              Otomatik kazanılsın
            </label>
          </div>

          <div className="field">
            Yayında

            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  setField(
                    "isPublished",
                    event.target.checked
                  )
                }
              />
              Profilde göster
            </label>
          </div>

          {form.isAutomatic && (
            <>
              <div className="field">
                <span>Koşul</span>

                <details
                  className="condition-dropdown"
                  onBlur={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget
                      )
                    ) {
                      event.currentTarget.removeAttribute(
                        "open"
                      );
                    }
                  }}
                >
                  <summary className="condition-trigger">
                    <span>
                      {ACHIEVEMENT_CONDITION_LABELS[
                        form.conditionType
                      ] ?? "Koşul seç"}
                    </span>

                    <span
                      className="condition-chevron"
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </summary>

                  <div className="condition-menu">
                    {GROUPS.map((group) => (
                      <div
                        className="condition-group"
                        key={group.value}
                        role="group"
                        aria-label={group.label}
                      >
                        <div className="condition-group-title">
                          {group.label}
                        </div>

                        {ACHIEVEMENT_CONDITIONS.filter(
                          (condition) =>
                            condition.category ===
                            group.value
                        ).map((condition) => (
                          <button
                            type="button"
                            key={condition.value}
                            className={
                              form.conditionType ===
                              condition.value
                                ? "condition-option selected"
                                : "condition-option"
                            }
                            aria-pressed={
                              form.conditionType ===
                              condition.value
                            }
                            onClick={(event) => {
                              setField(
                                "conditionType",
                                condition.value
                              );

                              event.currentTarget
                                .closest("details")
                                ?.removeAttribute("open");
                            }}
                          >
                            {condition.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <label className="field">
                Hedef
                <input
                  type="number"
                  min="1"
                  value={form.conditionValue}
                  onChange={(event) =>
                    setField(
                      "conditionValue",
                      event.target.value
                    )
                  }
                />
              </label>
            </>
          )}

          <label className="field">
            Sıralama
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) =>
                setField(
                  "sortOrder",
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="actions">
          <button
            className="button red"
            onClick={saveAchievement}
            disabled={saving}
          >
            {saving
              ? "Kaydediliyor..."
              : editingId
                ? "Değişiklikleri Kaydet"
                : "Başarım Oluştur"}
          </button>

          {editingId && (
            <button
              className="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
            >
              İptal
            </button>
          )}

          <button
            className="button green"
            onClick={evaluateAll}
            disabled={evaluating}
          >
            {evaluating
              ? "Taranıyor..."
              : "Otomatik Başarımları Tara"}
          </button>
        </div>
      </section>

      {message && (
        <div className="message">{message}</div>
      )}

      <section className="achievement-panel">
        <div className="achievement-eyebrow">
          ACHIEVEMENT LIBRARY
        </div>

        <h2>Rozetler &amp; Başarımlar</h2>

        {loading ? (
          <p>Yükleniyor...</p>
        ) : (
          <div className="achievement-list">
            {achievements.map((achievement) => (
              <article
                className="achievement-card"
                key={achievement.id}
              >
                <div className="card-image">
                  {achievement.image_url ? (
                    <img
                      src={achievement.image_url}
                      alt=""
                    />
                  ) : (
                    "🏆"
                  )}
                </div>

                <h3>{achievement.name}</h3>

                <p>
                  {achievement.description ||
                    "Açıklama yok."}
                </p>

                <div className="chips">
                  <span
                    className={`chip ${achievement.rarity}`}
                  >
                    {achievement.rarity}
                  </span>

                  <span className="chip xp">
                    +{achievement.xp_reward} XP
                  </span>

                  <span className="chip">
                    {achievement.is_automatic
                      ? "OTOMATİK"
                      : "MANUEL"}
                  </span>

                  <span className="chip">
                    {achievement.award_count} KAZANAN
                  </span>
                </div>

                <div className="condition-info">
                  {achievement.is_automatic
                    ? `${
                        CONDITIONS[
                          achievement.condition_type
                        ] ?? achievement.condition_type
                      } · ${achievement.condition_value}`
                    : "Yönetici tarafından verilir"}
                </div>

                <div className="card-actions">
                  <button
                    className="button"
                    onClick={() =>
                      editAchievement(achievement)
                    }
                  >
                    Düzenle
                  </button>

                  <button
                    className="button danger"
                    onClick={() =>
                      deleteAchievement(achievement)
                    }
                  >
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="achievement-panel">
        <div className="achievement-eyebrow">
          MANUAL AWARD CENTER
        </div>

        <h2>Kullanıcıya Rozet Ver</h2>

        <div className="user-layout">
          <div>
            <input
              className="search-input"
              value={userQuery}
              onChange={(event) =>
                setUserQuery(event.target.value)
              }
              placeholder="Kullanıcı ara..."
            />

            <div className="user-list">
              {users.map((user) => (
                <button
                  key={user.id}
                  className={[
                    "user-item",
                    selectedUser?.id === user.id
                      ? "active"
                      : "",
                  ].join(" ")}
                  onClick={() => selectUser(user)}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" />
                  ) : (
                    <div className="user-fallback">
                      {(
                        user.display_name ||
                        user.username ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <strong>
                      {user.display_name ||
                        user.username ||
                        "Kullanıcı"}
                    </strong>

                    <span>
                      {user.username
                        ? `@${user.username}`
                        : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="award-box">
            {!selectedUser ? (
              <p>Kullanıcı seç.</p>
            ) : (
              <>
                <h3>
                  {selectedUser.display_name ||
                    selectedUser.username}
                </h3>

                <select
                  value={selectedAchievementId}
                  onChange={(event) =>
                    setSelectedAchievementId(
                      event.target.value
                    )
                  }
                >
                  <option value="">Rozet seç</option>

                  {achievements.map((achievement) => (
                    <option
                      key={achievement.id}
                      value={achievement.id}
                    >
                      {achievement.name} · +
                      {achievement.xp_reward} XP
                    </option>
                  ))}
                </select>

                <input
                  value={awardNote}
                  onChange={(event) =>
                    setAwardNote(event.target.value)
                  }
                  placeholder="Admin notu"
                />

                <button
                  className="button red"
                  disabled={assigning}
                  onClick={assignAchievement}
                >
                  Rozeti Ver
                </button>

                <div className="existing-awards">
                  {userAwards.map((award) => (
                    <div
                      className="award-row"
                      key={award.id}
                    >
                      <div>
                        <strong>
                          {award.achievement?.name ||
                            "Başarım"}
                        </strong>

                        <span>
                          +
                          {award.xp_awarded ??
                            award.achievement
                              ?.xp_reward ??
                            0}{" "}
                          XP
                        </span>
                      </div>

                      <button
                        className="button danger"
                        onClick={() =>
                          revokeAchievement(award)
                        }
                      >
                        Geri Al
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = `
  .achievement-manager {
    display: grid;
    gap: 16px;
  }

  .achievement-panel {
    padding: 26px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 15px;
    background: #11151c;
  }

  .achievement-panel h2 {
    margin: 6px 0;
    font-size: 27px;
  }

  .achievement-eyebrow {
    color: #ff5149;
    font-size: 8px;
    font-weight: 1000;
    letter-spacing: .12em;
  }

  .panel-copy {
    color: #8995a3;
    font-size: 11px;
  }

  .form-grid {
    margin-top: 22px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .field {
    display: grid;
    gap: 7px;
    color: #a4afba;
    font-size: 9px;
    font-weight: 900;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .field input,
  .field select,
  .field textarea,
  .award-box input,
  .award-box select,
  .search-input {
    width: 100%;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 9px;
    outline: none;
    color: #ffffff;
    background: #0a0e14;
  }

  .field input,
  .field select,
  .award-box input,
  .award-box select,
  .search-input {
    height: 44px;
    padding: 0 12px;
  }

  .field textarea {
    min-height: 100px;
    padding: 12px;
    resize: vertical;
  }

  .achievement-manager select option {
    background: #ffffff;
    color: #0f172a;
  }

  /* YENİ BEYAZ BAŞARIM KOŞUL MENÜSÜ */

  .achievement-manager .condition-dropdown {
    width: 100%;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .achievement-manager .condition-trigger {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    padding: 11px 13px;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    background: #ffffff;
    color: #0f172a;
    line-height: 20px;
    cursor: pointer;
    list-style: none;
  }

  .achievement-manager .condition-trigger::-webkit-details-marker {
    display: none;
  }

  .achievement-manager .condition-trigger:focus-visible,
  .achievement-manager .condition-option:focus-visible {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }

  .achievement-manager .condition-chevron {
    flex-shrink: 0;
    color: #2563eb;
    font-size: 17px;
    transition: transform 150ms ease;
  }

  .achievement-manager .condition-dropdown[open] .condition-chevron {
    transform: rotate(180deg);
  }

  .achievement-manager .condition-menu {
    box-sizing: border-box;
    max-height: 350px;
    overflow-y: auto;
    margin-top: 6px;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 14px 28px rgba(0,0,0,.24);
  }

  .achievement-manager .condition-group-title {
    padding: 11px 9px 6px;
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .achievement-manager .condition-option {
    box-sizing: border-box;
    display: block;
    width: 100%;
    margin-bottom: 3px;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: 7px;
    background: #ffffff;
    color: #0f172a;
    text-align: left;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    cursor: pointer;
  }

  .achievement-manager .condition-option:hover,
  .achievement-manager .condition-option.selected {
    border-color: #bfdbfe;
    background: #dbeafe;
    color: #1e3a8a;
  }

  /* MEVCUT ADMIN PANELİ STİLLERİ */

  .xp-input-wrap {
    position: relative;
  }

  .xp-input-wrap input {
    padding-right: 52px;
  }

  .xp-input-wrap span {
    position: absolute;
    right: 13px;
    top: 50%;
    transform: translateY(-50%);
    color: #f0c75e;
    font-size: 10px;
    font-weight: 1000;
  }

  .toggle {
    min-height: 44px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 9px;
    background: #0a0e14;
  }

  .toggle input {
    width: auto;
    height: auto;
  }

  .upload-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .image-preview,
  .card-image {
    overflow: hidden;
    display: grid;
    place-items: center;
    background: #070a0e;
  }

  .image-preview {
    width: 120px;
    height: 120px;
    border-radius: 15px;
  }

  .image-preview img,
  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .button {
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 8px;
    color: #ffffff;
    background: rgba(255,255,255,.05);
    cursor: pointer;
    font-size: 9px;
    font-weight: 900;
  }

  .button.red {
    border: 0;
    background: linear-gradient(135deg,#b90000,#ff433b);
  }

  .button.green {
    color: #6fe6a2;
    border-color: rgba(65,220,135,.25);
    background: rgba(65,220,135,.08);
  }

  .button.danger {
    color: #ff817b;
  }

  .actions {
    margin-top: 18px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .message {
    padding: 13px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 10px;
    background: rgba(255,255,255,.03);
  }

  .achievement-list {
    margin-top: 20px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 12px;
  }

  .achievement-card {
    padding: 17px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 13px;
    background: #0b0f15;
  }

  .card-image {
    width: 85px;
    height: 85px;
    border-radius: 14px;
    font-size: 30px;
  }

  .achievement-card h3 {
    margin: 13px 0 5px;
  }

  .achievement-card p {
    color: #818c98;
    font-size: 9px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }

  .chip {
    padding: 5px 7px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 999px;
    font-size: 7px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .chip.rare {
    color: #6ca3ff;
  }

  .chip.epic {
    color: #c67dff;
  }

  .chip.legendary,
  .chip.xp {
    color: #f0c75e;
  }

  .condition-info {
    margin-top: 12px;
    color: #7c8793;
    font-size: 8px;
  }

  .card-actions {
    margin-top: 14px;
    display: flex;
    gap: 7px;
  }

  .user-layout {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 330px 1fr;
    gap: 14px;
  }

  .user-list {
    margin-top: 8px;
    display: grid;
    gap: 7px;
    max-height: 450px;
    overflow: auto;
  }

  .user-item {
    padding: 9px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 9px;
    color: #ffffff;
    background: #090d13;
    text-align: left;
    cursor: pointer;
  }

  .user-item.active {
    border-color: #ff5149;
  }

  .user-item img,
  .user-fallback {
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }

  .user-item img {
    object-fit: contain;
    background: #ffffff;
  }

  .user-fallback {
    display: grid;
    place-items: center;
    background: #292f38;
  }

  .user-item strong,
  .user-item span {
    display: block;
  }

  .user-item span {
    margin-top: 3px;
    color: #78838f;
    font-size: 8px;
  }

  .award-box {
    padding: 20px;
    display: grid;
    gap: 10px;
    align-content: start;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    background: #090d13;
  }

  .existing-awards {
    margin-top: 15px;
    display: grid;
    gap: 7px;
  }

  .award-row {
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 8px;
  }

  .award-row strong,
  .award-row span {
    display: block;
  }

  .award-row span {
    margin-top: 4px;
    color: #f0c75e;
    font-size: 8px;
  }

  @media (max-width: 1000px) {
    .achievement-list {
      grid-template-columns: 1fr 1fr;
    }

    .user-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 650px) {
    .form-grid,
    .achievement-list {
      grid-template-columns: 1fr;
    }

    .field.full {
      grid-column: auto;
    }
  }
`;
