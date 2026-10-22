import Link from "next/link";

import Header from "@/components/Header";
import AdminAchievementManager from "@/components/AdminAchievementManager";

import {
  createClient,
} from "@/utils/supabase/server";

export const dynamic =
  "force-dynamic";

export default async function AdminAchievementsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />

        <main className="achievement-admin-access">
          <style>
            {styles}
          </style>

          <div className="access-card">
            <span>
              11 MEDİPOL · ADMIN
            </span>

            <h1>
              Giriş Gerekli
            </h1>

            <p>
              Rozet ve başarım yönetimini
              kullanmak için giriş yapmalısın.
            </p>

            <Link
              href="/login"
              className="access-button"
            >
              Giriş Yap
            </Link>
          </div>
        </main>
      </>
    );
  }

  const {
    data:
      profile,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "is_admin"
      )
      .eq(
        "id",
        user.id
      )
      .single();

  if (
    !profile?.is_admin
  ) {
    return (
      <>
        <Header />

        <main className="achievement-admin-access">
          <style>
            {styles}
          </style>

          <div className="access-card">
            <span>
              11 MEDİPOL · ADMIN
            </span>

            <h1>
              Yetkisiz Erişim
            </h1>

            <p>
              Bu sayfayı yalnızca yöneticiler
              kullanabilir.
            </p>

            <Link
              href="/"
              className="access-button"
            >
              Ana Oayfa
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="achievement-admin-page">
        <style>
          {styles}
        </style>

        <div className="achievement-admin-wrap">
          <header className="achievement-admin-header">
            <div>
              <span>
                11 MEDİPOL · CONTROL CENTER
              </span>

              <h1>
                ROZET & BAŞARIM
              </h1>

              <p>
                Rozet tasarımlarını, otomatik
                kazanma şartlarını ve manuel
                ödüllendirmeleri yönet.
              </p>
            </div>

            <Link
              href="/admin"
              className="back-button"
            >
              ← ADMIN PANELİ
            </Link>
          </header>

          <AdminAchievementManager />
        </div>
      </main>
    </>
  );
}

const styles = `
  .achievement-admin-page,
  .achievement-admin-access {
    min-height:
      calc(100vh - 70px);

    color:
      #f4f7fa;

    background:
      radial-gradient(
        circle at 80% 0%,
        rgba(225,6,0,.12),
        transparent 30%
      ),
      linear-gradient(
        145deg,
        #0e1218,
        #07090d
      );
  }

  .achievement-admin-wrap {
    width:
      min(
        1450px,
        calc(100% - 36px)
      );

    margin:
      auto;

    padding:
      35px 0 90px;
  }

  .achievement-admin-header {
    margin-bottom:
      16px;

    padding:
      30px;

    display:
      flex;

    align-items:
      flex-end;

    justify-content:
      space-between;

    gap:
      20px;

    border:
      1px solid
      rgba(255,255,255,.09);

    border-radius:
      16px;

    background:
      linear-gradient(
        135deg,
        #1b222d,
        #11161e
      );
  }

  .achievement-admin-header span {
    color:
      #ff5149;

    font-size:
      8px;

    font-weight:
      1000;

    letter-spacing:
      .12em;
  }

  .achievement-admin-header h1 {
    margin:
      8px 0 6px;

    color:
      #fff;

    font-size:
      43px;

    letter-spacing:
      -.04em;
  }

  .achievement-admin-header p {
    margin:
      0;

    color:
      #8e99a6;

    font-size:
      11px;
  }

  .back-button,
  .access-button {
    min-height:
      42px;

    padding:
      0 15px;

    display:
      inline-flex;

    align-items:
      center;

    justify-content:
      center;

    border:
      1px solid
      rgba(255,255,255,.10);

    border-radius:
      8px;

    color:
      #fff;

    background:
      rgba(255,255,255,.04);

    font-size:
      9px;

    font-weight:
      900;
  }

  .achievement-admin-access {
    padding:
      60px 20px;
  }

  .access-card {
    width:
      min(
        650px,
        100%
      );

    margin:
      auto;

    padding:
      32px;

    border:
      1px solid
      rgba(255,255,255,.09);

    border-radius:
      16px;

    background:
      #12171f;
  }

  .access-card span {
    color:
      #ff5149;

    font-size:
      9px;

    font-weight:
      900;
  }

  .access-card h1 {
    color:
      #fff;
  }

  .access-card p {
    color:
      #929daa;
  }

  @media(max-width:700px) {
    .achievement-admin-header {
      align-items:
        flex-start;

      flex-direction:
        column;
    }
  }
`;
