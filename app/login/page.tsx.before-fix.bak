"use client";

import { useEffect, useState, type FormEvent } from "react";
import Header from "@/components/Header";
import { createClient } from "@/utils/supabase/client";
import styles from "./login.module.css";

type Theme = "gray" | "red" | "light";
type Mode = "login" | "register" | "forgot" | "reset";
type Feedback = { type: "success" | "error"; text: string } | null;

const features = [
  {
    code: "01 / 03 · RACE PREDICTION",
    title: "TAHMİNİNİ YAP. ZİRVEYE ÇIK.",
    description: "Yarışın podyumunu tahmin et, puan topla ve sezon boyunca liderlik tablosunda yüksel.",
    tab: "TAHMİNLER",
  },
  {
    code: "02 / 03 · COMMUNITY",
    title: "PADDOCK SENİN ALANIN.",
    description: "F1 gündemini tartış, gönderi paylaş ve yarış heyecanını topluluğun diğer üyeleriyle yaşa.",
    tab: "PADDOCK",
  },
  {
    code: "03 / 03 · DRIVER PROFILE",
    title: "KENDİ HİKÂYENİ YAZ.",
    description: "Profilini kişiselleştir, başarımlar kazan ve seviye atlayarak gridde ilerle.",
    tab: "PROFİL",
  },
] as const;

function parseTheme(value: string | null): Theme | null {
  const v = value?.toLocaleLowerCase("tr-TR").trim();
  if (v === "gray" || v === "grey" || v === "dark" || v === "koyu") return "gray";
  if (v === "red" || v === "kırmızı" || v === "kirmizi" || v === "f1-red") return "red";
  if (v === "light" || v === "açık" || v === "acik") return "light";
  return null;
}

function readTheme(): Theme {
  if (typeof document === "undefined") return "gray";
  const html = document.documentElement;
  const attributeTheme =
    parseTheme(html.getAttribute("data-theme")) ||
    parseTheme(html.getAttribute("data-site-theme"));
  if (attributeTheme) return attributeTheme;
  try {
    for (const key of ["f1-site-theme", "site-theme", "siteTheme", "theme"]) {
      const stored = parseTheme(localStorage.getItem(key));
      if (stored) return stored;
    }
  } catch {
    // Local storage may be restricted.
  }
  return "gray";
}

function Glyph({ name }: { name: "mail" | "lock" | "user" }) {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {name === "mail" ? (
        <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>
      ) : name === "user" ? (
        <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>
      ) : (
        <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>
      )}
    </svg>
  );
}

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const [theme, setTheme] = useState<Theme>("gray");
  const [featureIndex, setFeatureIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    const update = () => setTheme(readTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-site-theme", "class"],
    });
    window.addEventListener("theme-changed", update);
    window.addEventListener("site-theme-changed", update);
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("theme-changed", update);
      window.removeEventListener("site-theme-changed", update);
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setFeatureIndex((previous) => (previous + 1) % features.length), 6500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("recovery") === "1") {
      setMode("reset");
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const feature = features[featureIndex];
  const register = mode === "register";
  const forgot = mode === "forgot";
  const reset = mode === "reset";

  function switchMode(next: Mode) {
    setMode(next);
    setFeedback(null);
    setPassword("");
    setConfirmPassword("");
    setPasswordVisible(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFeedback(null);

    const normalizedEmail = email.trim();
    if (!reset && !normalizedEmail) {
      setFeedback({ type: "error", text: "E-posta adresini yazmalısın." });
      return;
    }
    if (register && !displayName.trim()) {
      setFeedback({ type: "error", text: "Görünen adını yazmalısın." });
      return;
    }
    if (!forgot && password.length < 6) {
      setFeedback({ type: "error", text: "Şifren en az 6 karakter olmalıdır." });
      return;
    }
    if ((register || reset) && password !== confirmPassword) {
      setFeedback({ type: "error", text: "Şifreler eşleşmiyor." });
      return;
    }

    setBusy(true);
    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/login?recovery=1`,
        });
        if (error) throw error;
        setFeedback({ type: "success", text: "Şifre sıfırlama bağlantısı gönderildi. E-posta kutunu kontrol et." });
      } else if (reset) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setFeedback({ type: "error", text: "Şifre sıfırlama oturumu doğrulanamadı. E-postandaki güncel bağlantıyı aç." });
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        switchMode("login");
        window.history.replaceState(null, "", "/login");
        setFeedback({ type: "success", text: "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin." });
      } else if (register) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          window.location.assign("/predict");
          return;
        }
        setFeedback({ type: "success", text: "Kayıt isteğin alındı. E-posta doğrulaması açıksa, gelen kutundaki bağlantıyı onayla." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        window.location.assign("/predict");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "İşlem sırasında hata oluştu. Tekrar dene.";
      setFeedback({ type: "error", text });
    } finally {
      setBusy(false);
    }
  }

  const title = register ? "GRIDDE YERİNİ AL." : forgot ? "ERİŞİMİ YENİLE." : reset ? "YENİ ŞİFRENİ BELİRLE." : "GRID'E HOŞ GELDİN.";
  const subtitle = register ? "Hesabını oluştur ve yarışın bir parçası ol." : forgot ? "E-posta adresine şifre sıfırlama bağlantısı gönderelim." : reset ? "Hesabın için yeni ve güvenli bir şifre belirle." : "Hesabına giriş yap, kaldığın yerden devam et.";

  return (
    <>
      <Header />
      <main className={`${styles.root} ${styles[theme]}`}>
        <div className={styles.background} aria-hidden="true">
          <div className={styles.grid} />
          <div className={`${styles.glow} ${styles.glowA}`} />
          <div className={`${styles.glow} ${styles.glowB}`} />
          <div className={styles.rings} />
          <div className={`${styles.beam} ${styles.beamOne}`} />
          <div className={`${styles.beam} ${styles.beamTwo}`} />
        </div>
        <div className={styles.shell}>
          <div className={styles.upper}>
            <span className={styles.eyebrow}><i /> F1 MEDİPOL · PADDOCK ACCESS</span>
            <span className={styles.live}><i /> RACE CONTROL EXPERIENCE</span>
          </div>

          <div className={styles.columns}>
            <section className={styles.story} aria-labelledby="auth-hero">
              <h1 id="auth-hero" className={styles.hero}>
                SADECE<br /><span className={styles.outline}>İZLEME.</span><br />
                <span className={styles.accentText}>YARIŞIN</span><br />
                <span className={styles.heroLast}>PARÇASI OL.</span>
              </h1>
              <p className={styles.storyDescription}>Bir yarış hafta sonundan çok daha fazlası. Tahminlerini yap, kendi profilini oluştur, sezon boyunca rekabet et ve F1 tutkunlarının topluluğuna katıl.</p>
              <div className={styles.tags}>
                <span>✓ &nbsp; YARIŞ TAHMİNLERİ</span>
                <span>✓ &nbsp; PADDOCK</span>
                <span>✓ &nbsp; BAŞARIMLAR</span>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureHeader}><span>PLATFORM / ÖZELLİKLER</span><span>F1 MEDİPOL</span></div>
                <div className={styles.featureContent} key={featureIndex}>
                  <div className={styles.featureCode}>{feature.code}</div>
                  <h2>{feature.title}</h2>
                  <p>{feature.description}</p>
                  <div className={styles.featureNumber} aria-hidden="true">0{featureIndex + 1}</div>
                </div>
                <div className={styles.featureTabs} aria-label="Platform özellikleri">
                  {features.map((entry, index) => (
                    <button type="button" key={entry.tab} className={featureIndex === index ? styles.active : ""} aria-pressed={featureIndex === index} onClick={() => setFeatureIndex(index)}>{entry.tab}</button>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.card} aria-label="F1 Medipol üyelik">
              <div className={styles.cardHeader}>
                <span>MEMBER ACCESS / 2026</span>
                <span className={styles.status}>● &nbsp; ÜYELİK ALANI</span>
              </div>
              <h2 className={styles.cardTitle}>{title}</h2>
              <p className={styles.cardSubtitle}>{subtitle}</p>
              {mode === "login" || register ? (
                <div className={styles.switcher} role="tablist" aria-label="Üyelik işlemi">
                  <button type="button" role="tab" aria-selected={!register} className={!register ? styles.selected : ""} onClick={() => switchMode("login")}>OTURUM AÇ</button>
                  <button type="button" role="tab" aria-selected={register} className={register ? styles.selected : ""} onClick={() => switchMode("register")}>KAYIT OL</button>
                </div>
              ) : (
                <button type="button" className={styles.back} onClick={() => switchMode("login")}>← Oturum açma ekranına dön</button>
              )}

              <form className={styles.form} onSubmit={submit}>
                {register && <div className={styles.field}>
                  <label htmlFor="fm-name">GÖRÜNEN AD</label>
                  <div className={styles.inputBox}><Glyph name="user" /><input id="fm-name" autoComplete="nickname" type="text" placeholder="Paddock'ta görünecek adın" maxLength={60} required value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
                </div>}
                {!reset && <div className={styles.field}>
                  <label htmlFor="fm-email">E-POSTA ADRESİ</label>
                  <div className={styles.inputBox}><Glyph name="mail" /><input id="fm-email" autoComplete="email" type="email" placeholder="ornek@eposta.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>}
                {!forgot && <div className={styles.field}>
                  <div className={styles.labelLine}>
                    <label htmlFor="fm-password">{reset ? "YENİ ŞİFRE" : "ŞİFRE"}</label>
                    {mode === "login" && <button type="button" className={styles.forgot} onClick={() => switchMode("forgot")}>Şifremi unuttum</button>}
                  </div>
                  <div className={styles.inputBox}><Glyph name="lock" /><input id="fm-password" autoComplete={register || reset ? "new-password" : "current-password"} type={passwordVisible ? "text" : "password"} placeholder="En az 6 karakter" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className={styles.showPassword} onClick={() => setPasswordVisible((x) => !x)} aria-label={passwordVisible ? "Şifreyi gizle" : "Şifreyi göster"}>{passwordVisible ? "GİZLE" : "GÖSTER"}</button></div>
                </div>}
                {(register || reset) && <div className={styles.field}>
                  <label htmlFor="fm-confirm">ŞİFRE TEKRARI</label>
                  <div className={styles.inputBox}><Glyph name="lock" /><input id="fm-confirm" autoComplete="new-password" type={passwordVisible ? "text" : "password"} placeholder="Şifreni tekrar gir" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                </div>}
                {register && <p className={styles.terms}>Hesabını oluşturarak F1 Medipol topluluk kurallarını kabul etmiş olursun.</p>}
                {feedback && <div role="status" aria-live="polite" className={`${styles.feedback} ${feedback.type === "success" ? styles.success : ""}`}>{feedback.text}</div>}
                <button type="submit" className={styles.submit} disabled={busy}>
                  <span>{busy ? "İŞLEM YAPILIYOR..." : register ? "HESABIMI OLUŞTUR" : forgot ? "SIFIRLAMA BAĞLANTISI GÖNDER" : reset ? "ŞİFREMİ GÜNCELLE" : "PADDOCK'A GİRİŞ YAP"}</span><span aria-hidden="true">↗</span>
                </button>
              </form>
              <div className={styles.cardFooter}><b>F1 MEDİPOL</b> · Yarış pistte bitmez.</div>
            </section>
          </div>
          <footer className={styles.footer}><span>© F1 MEDİPOL · DIGITAL PADDOCK EXPERIENCE</span><span className={styles.footerRight}><i /> BEYOND THE GRID</span></footer>
        </div>
      </main>
    </>
  );
}
