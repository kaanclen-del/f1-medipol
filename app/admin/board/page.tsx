import {
  redirect,
} from "next/navigation";

import Header from "@/components/Header";

import AdminBoardForm from "@/components/AdminBoardForm";
import AdminBoardActions from "@/components/AdminBoardActions";

import {
  createClient,
} from "@/utils/supabase/server";

import {
  createAdminClient,
} from "@/utils/supabase/admin";

export const dynamic =
  "force-dynamic";

type BoardMember = {
  id: string;

  name:
    | string
    | null;

  role:
    | string
    | null;

  bio:
    | string
    | null;

  image_url:
    | string
    | null;

  detail_image_url:
    | string
    | null;

  instagram_url:
    | string
    | null;

  linkedin_url:
    | string
    | null;

  sort_order:
    number;

  is_published:
    boolean;

  created_at:
    string;
};

export default async function AdminBoardPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login"
    );
  }

  const {
    data: profile,
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
    redirect("/");
  }

  const admin =
    createAdminClient();

  const {
    data,
  } =
    await admin
      .from(
        "board_members"
      )
      .select("*")
      .order(
        "sort_order",
        {
          ascending:
            true,
        }
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      );

  const members =
    (data ??
      []) as BoardMember[];

  return (
    <>
      <Header />

      <main className="admin-board-page">
        <style>{`
          .admin-board-page {
            min-height:
              100vh;

            padding:
              40px 24px
              90px;

            color:
              var(--text);
          }

          .admin-board-wrap {
            width:
              min(
                1280px,
                100%
              );

            margin:
              0 auto;
          }

          .admin-board-head {
            display:
              flex;

            justify-content:
              space-between;

            align-items:
              flex-end;

            gap:
              20px;

            margin-bottom:
              30px;
          }

          .admin-board-head
          h1 {
            margin:
              7px 0 0;

            font-size:
              38px;

            letter-spacing:
              -.045em;
          }

          .admin-board-head
          p {
            max-width:
              700px;

            margin:
              10px 0 0;

            color:
              var(--muted);

            font-size:
              12px;

            line-height:
              1.65;
          }

          .admin-board-back {
            min-height:
              39px;

            padding:
              0 13px;

            display:
              inline-flex;

            align-items:
              center;

            border:
              1px solid
              var(--border);

            border-radius:
              9px;

            background:
              var(--panel-soft);

            color:
              var(--text);

            font-size:
              9px;

            font-weight:
              900;
          }

          .admin-board-section {
            padding:
              24px;

            border:
              1px solid
              var(--border);

            border-radius:
              17px;

            background:
              linear-gradient(
                145deg,
                var(--panel),
                var(--panel-2)
              );

            box-shadow:
              var(--shadow);
          }

          .admin-board-section
          h2 {
            margin:
              0 0 21px;

            font-size:
              23px;
          }

          .admin-board-list-head {
            display:
              flex;

            align-items:
              flex-end;

            justify-content:
              space-between;

            gap:
              20px;

            margin:
              42px 0 17px;
          }

          .admin-board-list-head
          h2 {
            margin: 0;

            font-size:
              28px;
          }

          .admin-board-count {
            color:
              var(--muted);

            font-size:
              10px;
          }

          .admin-board-grid {
            display:
              grid;

            grid-template-columns:
              repeat(
                auto-fill,
                minmax(
                  290px,
                  1fr
                )
              );

            gap:
              18px;

            align-items:
              start;
          }

          .admin-member-card {
            overflow:
              hidden;

            border:
              1px solid
              var(--border);

            border-radius:
              16px;

            background:
              linear-gradient(
                145deg,
                var(--panel),
                var(--panel-2)
              );

            box-shadow:
              0 15px 35px
              rgba(
                0,
                0,
                0,
                .10
              );
          }

          .admin-member-image {
            position:
              relative;

            width:
              100%;

            aspect-ratio:
              3 / 4;

            overflow:
              hidden;

            background:
              #111;
          }

          .admin-member-image
          img {
            width:
              100%;

            height:
              100%;

            display:
              block;

            object-fit:
              cover;
          }

          .admin-member-order {
            position:
              absolute;

            top:
              11px;

            left:
              11px;

            min-width:
              38px;

            height:
              31px;

            padding:
              0 9px;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            border:
              1px solid
              rgba(
                255,
                255,
                255,
                .17
              );

            border-radius:
              999px;

            color:
              white;

            background:
              rgba(
                7,
                9,
                12,
                .70
              );

            backdrop-filter:
              blur(10px);

            font-size:
              9px;

            font-weight:
              1000;
          }

          .admin-publish-badge {
            position:
              absolute;

            top:
              11px;

            right:
              11px;

            min-height:
              31px;

            padding:
              0 9px;

            display:
              inline-flex;

            align-items:
              center;

            border:
              1px solid
              rgba(
                255,
                255,
                255,
                .17
              );

            border-radius:
              999px;

            color:
              white;

            background:
              rgba(
                7,
                9,
                12,
                .70
              );

            font-size:
              8px;

            font-weight:
              1000;
          }

          .admin-publish-badge
          .dot {
            width:
              6px;

            height:
              6px;

            margin-right:
              5px;

            border-radius:
              50%;
          }

          .admin-publish-badge
          .dot.on {
            background:
              #4ee18d;
          }

          .admin-publish-badge
          .dot.off {
            background:
              #888;
          }

          .admin-member-body {
            padding:
              17px;
          }

          .admin-member-body
          h3 {
            margin: 0;

            font-size:
              20px;

            letter-spacing:
              -.025em;
          }

          .admin-member-role {
            margin-top:
              4px;

            color:
              var(--accent);

            font-size:
              10px;

            font-weight:
              900;
          }

          .admin-member-bio {
            margin-top:
              10px;

            color:
              var(--muted);

            font-size:
              10px;

            line-height:
              1.6;
          }

          .admin-detail-preview {
            margin-top:
              13px;

            padding:
              10px;

            border:
              1px solid
              var(--border);

            border-radius:
              10px;

            background:
              var(--panel-soft);
          }

          .admin-detail-preview
          small {
            display:
              block;

            margin-bottom:
              7px;

            color:
              var(--muted);

            font-size:
              7px;

            font-weight:
              900;

            letter-spacing:
              .11em;
          }

          .admin-detail-preview
          img {
            width:
              100%;

            height:
              105px;

            display:
              block;

            object-fit:
              cover;

            border-radius:
              7px;
          }

          .admin-empty {
            padding:
              38px;

            border:
              1px dashed
              var(--border);

            border-radius:
              14px;

            color:
              var(--muted);

            text-align:
              center;
          }

          :root[data-site-theme="light"]
          .admin-member-image {
            background:
              #e8ebef;
          }

          @media(
            max-width:
              700px
          ) {
            .admin-board-page {
              padding:
                28px 12px
                75px;
            }

            .admin-board-head {
              align-items:
                flex-start;

              flex-direction:
                column;
            }

            .admin-board-section {
              padding:
                17px;
            }

            .admin-board-grid {
              grid-template-columns:
                1fr;
            }
          }
        `}</style>

        <div className="admin-board-wrap">
          <div className="admin-board-head">
            <div>
              <div className="eyebrow">
                ADMIN PANELİ · YÖNETİM KURULU
              </div>

              <h1>
                Yönetim Kurulu Yönetimi
              </h1>

              <p>
                Yeni üyeler ekleyebilir, mevcut üyelerin
                bilgilerini ve görsellerini değiştirebilir,
                kart sırasını düzenleyebilir ve yayın durumunu
                kontrol edebilirsin.
              </p>
            </div>

            <a
              href="/admin"
              className="admin-board-back"
            >
              ← ADMIN PANELİ
            </a>
          </div>

          {/* YENİ KART */}

          <section className="admin-board-section">
            <h2>
              Yeni Yönetim Kurulu Üyesi
            </h2>

            <AdminBoardForm />
          </section>

          {/* KAYITLI KARTLAR */}

          <div className="admin-board-list-head">
            <div>
              <div className="eyebrow">
                BOARD MEMBERS
              </div>

              <h2>
                Kayıtlı Üyeler
              </h2>
            </div>

            <div className="admin-board-count">
              {members.length} KAYIT
            </div>
          </div>

          {members.length === 0 ? (
            <div className="admin-empty">
              Henüz yönetim kurulu üyesi eklenmemiş.
            </div>
          ) : (
            <div className="admin-board-grid">
              {members.map(
                (
                  member,
                  index
                ) => (
                  <article
                    key={
                      member.id
                    }
                    className="admin-member-card"
                  >
                    <div className="admin-member-image">
                      {member.image_url ? (
                        <img
                          src={
                            member.image_url
                          }
                          alt={
                            member.name ??
                            "Yönetim Kurulu"
                          }
                        />
                      ) : (
                        <div className="admin-empty">
                          Görsel yok
                        </div>
                      )}

                      <div className="admin-member-order">
                        #{index + 1}
                      </div>

                      <div className="admin-publish-badge">
                        <span
                          className={`dot ${
                            member.is_published
                              ? "on"
                              : "off"
                          }`}
                        />

                        {member.is_published
                          ? "YAYINDA"
                          : "TASLAK"}
                      </div>
                    </div>

                    <div className="admin-member-body">
                      <h3>
                        {member.name ||
                          "İsimsiz Üye"}
                      </h3>

                      <div className="admin-member-role">
                        {member.role ||
                          "Görev belirtilmedi"}
                      </div>

                      {member.bio && (
                        <div className="admin-member-bio">
                          {member.bio}
                        </div>
                      )}

                      {member.detail_image_url && (
                        <div className="admin-detail-preview">
                          <small>
                            GENİŞ PROFİL GÖRSELİ
                          </small>

                          <img
                            src={
                              member.detail_image_url
                            }
                            alt=""
                          />
                        </div>
                      )}

                      <AdminBoardActions
                        memberId={
                          member.id
                        }

                        memberName={
                          member.name
                        }

                        role={
                          member.role
                        }

                        bio={
                          member.bio
                        }

                        imageUrl={
                          member.image_url
                        }

                        detailImageUrl={
                          member.detail_image_url
                        }

                        instagramUrl={
                          member.instagram_url
                        }

                        linkedinUrl={
                          member.linkedin_url
                        }

                        sortOrder={
                          member.sort_order ??
                          index + 1
                        }

                        isPublished={
                          member.is_published
                        }
                      />
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}