import Link from "next/link";

import PaddockComposer from "@/components/PaddockComposer";
import PaddockPoll from "@/components/PaddockPoll";
import PaddockLikeButton from "@/components/PaddockLikeButton";
import PaddockComments from "@/components/PaddockComments";
import PaddockBookmarkButton from "@/components/PaddockBookmarkButton";
import PaddockFollowButton from "@/components/PaddockFollowButton";
import PaddockShareButton from "@/components/PaddockShareButton";
import PaddockDeleteButton from "@/components/PaddockDeleteButton";
import PaddockPinButton from "@/components/PaddockPinButton";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    feed?: string | string[];
    page?: string | string[];
    focus?: string | string[];
  }>;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

type PostMedia = {
  id: string;
  post_id: string;
  media_url: string;
  media_type: "image" | "video";
  sort_order: number;
};

type PollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  sort_order: number;
  vote_count: number;
};

type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
};

type Follow = {
  follower_id: string;
  following_id: string;
};

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  is_admin_post: boolean;
  is_pinned: boolean;
  created_at: string;

  profile: Profile | null;
  media: PostMedia[];
  poll: Poll | null;

  like_count: number;
  liked_by_current_user: boolean;

  comment_count: number;

  bookmarked_by_current_user: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(profile: Profile | null) {
  const text =
    profile?.display_name ||
    profile?.username ||
    "F1";

  return text
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function extractHashtags(posts: Post[]) {
  const counts = new Map<string, number>();

  for (const post of posts) {
    const content = post.content ?? "";

    const matches =
      content.match(/#[\p{L}\p{N}_]+/gu) ?? [];

    for (const tag of matches) {
      const normalized =
        tag.toLocaleLowerCase("tr-TR");

      counts.set(
        normalized,
        (counts.get(normalized) ?? 0) + 1
      );
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

function PostMediaGrid({
  media,
}: {
  media: PostMedia[];
}) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          media.length === 1
            ? "1fr"
            : "repeat(2, minmax(0, 1fr))",
        gap: "6px",
        marginTop: "14px",
        overflow: "hidden",
        borderRadius: "16px",
      }}
    >
      {media.map((item) => (
        <div
          key={item.id}
          style={{
            position: "relative",
            background: "#111",
            overflow: "hidden",
            border: "1px solid #252525",
            aspectRatio:
              media.length === 1
                ? "16 / 9"
                : "1 / 1",
          }}
        >
          {item.media_type === "image" ? (
            <img
              src={item.media_url}
              alt="Paddock gönderi görseli"
              loading="lazy"
              decoding="async"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <video
              src={item.media_url}
              controls
              preload="none"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                background: "#000",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default async function PaddockPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const feedParam = Array.isArray(params.feed)
    ? params.feed[0]
    : params.feed;

  const feedMode =
    feedParam === "following"
      ? "following"
      : feedParam === "saved"
        ? "saved"
        : "for-you";

  // Sayfa başına yalnızca 20 gönderi + sonraki sayfa kontrolü için 1 kayıt.
  const PAGE_SIZE = 20;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const requestedPage = Number(pageValue || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, 1000)
    : 1;
  const focusParam = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const focusId = focusParam && /^[0-9a-f-]{36}$/i.test(focusParam)
    ? focusParam
    : null;

  const admin = createAdminClient();
  const supabase = await createClient();

  // Önemli: Birbirinden bağımsız işlemler ardışık değil paralel.
  const [authResult, profilesResult, followsResult] = await Promise.all([
    supabase.auth.getUser(),
    admin.from("profiles").select("id, username, display_name, avatar_url, is_admin"),
    admin.from("paddock_follows").select("follower_id, following_id"),
  ]);

  const user = authResult.data.user;
  const allProfiles = (profilesResult.data ?? []) as Profile[];
  const follows = (followsResult.data ?? []) as Follow[];
  const profileById = new Map(allProfiles.map((profile) => [profile.id, profile]));
  const currentProfile = user ? profileById.get(user.id) ?? null : null;
  const followedUserIds = new Set(
    user ? follows.filter((follow) => follow.follower_id === user.id)
      .map((follow) => follow.following_id) : []
  );

  let savedPostIds: string[] = [];
  if (feedMode === "saved" && user) {
    const savedResult = await admin
      .from("paddock_post_bookmarks")
      .select("post_id")
      .eq("user_id", user.id);
    savedPostIds = (savedResult.data ?? []).map((row) => row.post_id);
  }

  let rawPosts: {
    id: string;
    user_id: string;
    content: string | null;
    is_admin_post: boolean;
    is_pinned: boolean;
    created_at: string;
  }[] = [];
  let error: { message: string } | null = null;
  let hasNextPage = false;

  // Filtreleri sunucuda uygula; önce bütün gönderileri indirmiyoruz.
  const canQuery = feedMode === "for-you" ||
    (Boolean(user) && (feedMode === "following"
      ? followedUserIds.size > 0 : savedPostIds.length > 0));

  if (canQuery) {
    let query = admin
      .from("paddock_posts")
      .select("id, user_id, content, is_admin_post, is_pinned, created_at")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (feedMode === "following") {
      query = query.in("user_id", [...followedUserIds]);
    } else if (feedMode === "saved") {
      query = query.in("id", savedPostIds);
    }

    const first = (page - 1) * PAGE_SIZE;
    const postResult = await query.range(first, first + PAGE_SIZE);
    error = postResult.error;
    const fetched = postResult.data ?? [];
    hasNextPage = fetched.length > PAGE_SIZE;
    rawPosts = fetched.slice(0, PAGE_SIZE);
  }

  // Eski bildirimlerin #post-UUID bağlantılarını koru.
  if (focusId && feedMode === "for-you" && !rawPosts.some((post) => post.id === focusId)) {
    const focused = await admin
      .from("paddock_posts")
      .select("id, user_id, content, is_admin_post, is_pinned, created_at")
      .eq("is_published", true)
      .eq("id", focusId)
      .maybeSingle();
    if (focused.data) rawPosts = [focused.data, ...rawPosts];
  }

  const postIds = rawPosts.map((post) => post.id);
  let allMedia: PostMedia[] = [];
  let polls: { id: string; post_id: string; question: string }[] = [];
  let pollOptions: { id: string; poll_id: string; option_text: string; sort_order: number }[] = [];
  let pollVotes: { id: string; poll_id: string; option_id: string }[] = [];
  let postLikes: { post_id: string; user_id: string }[] = [];
  let postComments: { post_id: string }[] = [];
  let userBookmarks: { post_id: string; user_id: string }[] = [];

  if (postIds.length) {
    // Aynı sayfanın medya, anket, beğeni ve yorum sorguları paralel.
    const [mediaRes, pollRes, likesRes, commentsRes, bookmarkRes] = await Promise.all([
      admin.from("paddock_post_media")
        .select("id, post_id, media_url, media_type, sort_order")
        .in("post_id", postIds).order("sort_order", { ascending: true }),
      admin.from("paddock_polls")
        .select("id, post_id, question").in("post_id", postIds),
      admin.from("paddock_post_likes")
        .select("post_id, user_id").in("post_id", postIds),
      admin.from("paddock_comments")
        .select("post_id").in("post_id", postIds),
      user ? admin.from("paddock_post_bookmarks")
        .select("post_id, user_id").eq("user_id", user.id)
        .in("post_id", postIds) : Promise.resolve({ data: [] }),
    ]);
    allMedia = (mediaRes.data ?? []) as PostMedia[];
    polls = pollRes.data ?? [];
    postLikes = likesRes.data ?? [];
    postComments = commentsRes.data ?? [];
    userBookmarks = bookmarkRes.data ?? [];
  }

  const pollIds = polls.map((poll) => poll.id);
  if (pollIds.length) {
    const [optionsRes, votesRes] = await Promise.all([
      admin.from("paddock_poll_options")
        .select("id, poll_id, option_text, sort_order")
        .in("poll_id", pollIds).order("sort_order", { ascending: true }),
      admin.from("paddock_poll_votes")
        .select("id, poll_id, option_id").in("poll_id", pollIds),
    ]);
    pollOptions = optionsRes.data ?? [];
    pollVotes = votesRes.data ?? [];
  }

  // Taramaları Map ile bir seferde hazırla (her gönderi için tekrar filtreleme yok).
  const groupBy = <T,>(rows: T[], keyFn: (row: T) => string) => {
    const grouped = new Map<string, T[]>();
    rows.forEach((row) => {
      const key = keyFn(row);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    });
    return grouped;
  };
  const mediaByPost = groupBy(allMedia, (row) => row.post_id);
  const pollsByPost = new Map(polls.map((poll) => [poll.post_id, poll]));
  const likesByPost = groupBy(postLikes, (row) => row.post_id);
  const commentsByPost = groupBy(postComments, (row) => row.post_id);
  const bookmarksSet = new Set(userBookmarks.map((bookmark) => bookmark.post_id));
  const optionsByPoll = groupBy(pollOptions, (option) => option.poll_id);
  const votesByPoll = groupBy(pollVotes, (vote) => vote.poll_id);

  const posts: Post[] = rawPosts.map((post) => {
    const rawPoll = pollsByPost.get(post.id);
    const votes = rawPoll ? votesByPoll.get(rawPoll.id) ?? [] : [];
    const votesPerOption = new Map<string, number>();
    for (const vote of votes) {
      votesPerOption.set(vote.option_id, (votesPerOption.get(vote.option_id) ?? 0) + 1);
    }
    const poll: Poll | null = rawPoll ? {
      id: rawPoll.id,
      question: rawPoll.question,
      options: (optionsByPoll.get(rawPoll.id) ?? []).map((option) => ({
        ...option,
        vote_count: votesPerOption.get(option.id) ?? 0,
      })),
      total_votes: votes.length,
    } : null;
    const likes = likesByPost.get(post.id) ?? [];

    return {
      ...post,
      profile: profileById.get(post.user_id) ?? null,
      media: mediaByPost.get(post.id) ?? [],
      poll,
      like_count: likes.length,
      liked_by_current_user: Boolean(user && likes.some((like) => like.user_id === user.id)),
      comment_count: commentsByPost.get(post.id)?.length ?? 0,
      bookmarked_by_current_user: bookmarksSet.has(post.id),
    };
  });

  // Artık sunucuda filtreleniyor; sayfadaki kart sayısı sınırlı.
  const visiblePosts = posts;
  const adminPosts = posts
    .filter((post) => post.is_admin_post || post.profile?.is_admin)
    .slice(0, 8);
  const hashtags = extractHashtags(posts);

  const followerCounts = new Map<string, number>();
  for (const follow of follows) {
    followerCounts.set(follow.following_id, (followerCounts.get(follow.following_id) ?? 0) + 1);
  }
  const suggestedProfiles = allProfiles
    .filter((profile) => profile.id !== user?.id)
    .sort((a, b) => {
      if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1;
      return (followerCounts.get(b.id) ?? 0) - (followerCounts.get(a.id) ?? 0);
    })
    .slice(0, 5);

  const feedQuery = feedMode === "for-you" ? "" : `feed=${encodeURIComponent(feedMode)}&`;
  const paginationUrl = (targetPage: number) => `/paddock?${feedQuery}page=${targetPage}`;

  return (
    <main
      className="paddock-theme-page"
      style={{
        minHeight: "100vh",
        background: "#060606",
        color: "#fff",
        padding: "34px 20px 90px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1450px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              color: "#c51f32",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "2px",
              marginBottom: "10px",
            }}
          >
            MEDİPOL F1 KULÜBÜ
          </div>

          <h1
            style={{
              margin: 0,
              fontSize:
                "clamp(36px, 5vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-2px",
            }}
          >
            Paddock
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              color: "#888",
              maxWidth: "700px",
              lineHeight: 1.7,
            }}
          >
            Formula 1 topluluğuyla paylaş,
            tartış ve gündemi takip et.
          </p>
        </header>

        <section
          style={{
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <strong>
              Kulüpten
            </strong>

            <span
              style={{
                fontSize: "12px",
                color: "#666",
              }}
            >
              Resmî paylaşımlar
            </span>
          </div>

          {adminPosts.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: "14px",
                overflowX: "auto",
                paddingBottom: "10px",
              }}
            >
              {adminPosts.map((post) => (
                <article
                  key={post.id}
                  style={{
                    flex:
                      "0 0 min(390px, 82vw)",
                    padding: "18px",
                    borderRadius: "18px",
                    border:
                      post.is_pinned
                        ? "1px solid #7b2635"
                        : "1px solid #40151c",
                    background:
                      "linear-gradient(135deg, #16090c, #0a0a0a)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <Link href={`/members/${post.user_id}`} aria-label="Gönderi sahibinin profilini ziyaret et" style={{display:"block",flex:"0 0 auto",borderRadius:"50%"}}><div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        background: "#252525",
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "center",
                        fontWeight: 800,
                        fontSize: "12px",
                      }}
                    >
                      {post.profile
                        ?.avatar_url ? (
                        <img
                          src={
                            post.profile
                              .avatar_url
                          }
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      ) : (
                        getInitials(
                          post.profile
                        )
                      )}
                    </div></Link>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Link href={`/members/${post.user_id}`} style={{color:"inherit",textDecoration:"none"}} aria-label="Profili ziyaret et"><strong
                          style={{
                            fontSize: "13px",
                          }}
                        >
                          {post.profile
                            ?.display_name ||
                            post.profile
                              ?.username ||
                            "Medipol F1"}
                        </strong></Link>

                        {post.is_pinned && (
                          <span
                            style={{
                              color:
                                "#ff647b",
                              fontSize:
                                "9px",
                              fontWeight:
                                800,
                            }}
                          >
                            📌 SABİT
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          color: "#777",
                          fontSize: "11px",
                          marginTop: "2px",
                        }}
                      >
                        Kulüp paylaşımı
                      </div>
                    </div>
                  </div>

                  {post.content && (
                    <div
                      style={{
                        color: "#ddd",
                        fontSize: "14px",
                        lineHeight: 1.6,
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {post.content}
                    </div>
                  )}

                  <PostMediaGrid
                    media={post.media}
                  />

                  {post.poll && (
                    <PaddockPoll
                      poll={post.poll}
                    />
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "20px",
                border:
                  "1px dashed #2d2d2d",
                borderRadius: "16px",
                color: "#666",
              }}
            >
              Henüz kulüp paylaşımı yok.
            </div>
          )}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) 330px",
            gap: "26px",
            alignItems: "start",
          }}
        >
          <section
            style={{
              minWidth: 0,
            }}
          >
            <PaddockComposer />

            <div
              style={{
                display: "flex",
                gap: "22px",
                marginTop: "24px",
                padding: "0 4px 14px",
                borderBottom:
                  "1px solid #222",
                overflowX: "auto",
              }}
            >
              <Link
                href="/paddock"
                style={{
                  color:
                    feedMode === "for-you"
                      ? "#fff"
                      : "#666",
                  fontWeight:
                    feedMode === "for-you"
                      ? 700
                      : 400,
                  textDecoration: "none",
                  paddingBottom: "8px",
                  borderBottom:
                    feedMode === "for-you"
                      ? "2px solid #c51f32"
                      : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Sana Özel
              </Link>

              <Link
                href="/paddock?feed=following"
                style={{
                  color:
                    feedMode === "following"
                      ? "#fff"
                      : "#666",
                  fontWeight:
                    feedMode === "following"
                      ? 700
                      : 400,
                  textDecoration: "none",
                  paddingBottom: "8px",
                  borderBottom:
                    feedMode === "following"
                      ? "2px solid #c51f32"
                      : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Takip Edilenler
              </Link>

              <Link
                href="/paddock?feed=saved"
                style={{
                  color:
                    feedMode === "saved"
                      ? "#fff"
                      : "#666",
                  fontWeight:
                    feedMode === "saved"
                      ? 700
                      : 400,
                  textDecoration: "none",
                  paddingBottom: "8px",
                  borderBottom:
                    feedMode === "saved"
                      ? "2px solid #c51f32"
                      : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Kaydedilenler
              </Link>
            </div>

            {error ? (
              <div
                style={{
                  marginTop: "20px",
                  padding: "22px",
                  borderRadius: "14px",
                  background: "#160a0a",
                  border:
                    "1px solid #3b1717",
                  color: "#ffb4b4",
                }}
              >
                Paddock gönderileri
                yüklenemiyor.
              </div>
            ) : feedMode ===
                "following" &&
              !user ? (
              <div
                style={{
                  marginTop: "20px",
                  padding: "24px",
                  border:
                    "1px solid #242424",
                  borderRadius: "16px",
                  background: "#0c0c0c",
                  color: "#888",
                  lineHeight: 1.6,
                }}
              >
                Takip ettiğin kişilerin
                gönderilerini görmek için
                giriş yapmalısın.
              </div>
            ) : feedMode === "saved" &&
              !user ? (
              <div
                style={{
                  marginTop: "20px",
                  padding: "24px",
                  border:
                    "1px solid #242424",
                  borderRadius: "16px",
                  background: "#0c0c0c",
                  color: "#888",
                  lineHeight: 1.6,
                }}
              >
                Kaydettiğin gönderileri
                görmek için giriş
                yapmalısın.
              </div>
            ) : visiblePosts.length ===
              0 ? (
              <div
                style={{
                  marginTop: "20px",
                  padding: "24px",
                  border:
                    "1px solid #242424",
                  borderRadius: "16px",
                  background: "#0c0c0c",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    marginBottom: "7px",
                  }}
                >
                  {feedMode === "saved"
                    ? "Henüz kaydedilmiş gönderi yok."
                    : "Henüz gönderi yok."}
                </strong>

                <div
                  style={{
                    color: "#777",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  {feedMode === "following"
                    ? "Takip ettiğin kullanıcıların gönderileri burada görünecek."
                    : feedMode === "saved"
                      ? "Bir gönderideki ☆ Kaydet butonuna bastığında gönderi burada görünecek."
                      : "İlk Paddock gönderisini sen paylaşabilirsin."}
                </div>
              </div>
            ) : (
              visiblePosts.map((post) => {
                const canDelete =
                  Boolean(user) &&
                  (
                    post.user_id ===
                      user?.id ||
                    Boolean(
                      currentProfile?.is_admin
                    )
                  );

                return (
                  <article
                    id={`post-${post.id}`}
                    key={post.id}
                    style={{
                      padding: "20px 4px",
                      borderBottom:
                        "1px solid #202020",
                      scrollMarginTop:
                        "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <Link href={`/members/${post.user_id}`} aria-label="Gönderi sahibinin profilini ziyaret et" style={{display:"block",flex:"0 0 auto",borderRadius:"50%"}}><div
                        style={{
                          width: "46px",
                          height: "46px",
                          flex: "0 0 auto",
                          borderRadius:
                            "50%",
                          overflow:
                            "hidden",
                          background:
                            "#1d1d1d",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          fontWeight: 800,
                        }}
                      >
                        {post.profile
                          ?.avatar_url ? (
                          <img
                            src={
                              post.profile
                                .avatar_url
                            }
                            alt=""
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "cover",
                            }}
                          />
                        ) : (
                          getInitials(
                            post.profile
                          )
                        )}
                      </div></Link>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "8px",
                                flexWrap:
                                  "wrap",
                                alignItems:
                                  "center",
                              }}
                            >
                              <Link href={`/members/${post.user_id}`} style={{color:"inherit",textDecoration:"none"}} aria-label="Profili ziyaret et"><strong>
                                {post.profile
                                  ?.display_name ||
                                  post.profile
                                    ?.username ||
                                  "Kullanıcı"}
                              </strong></Link>

                              {post.is_admin_post && (
                                <span
                                  style={{
                                    padding:
                                      "3px 7px",
                                    borderRadius:
                                      "999px",
                                    background:
                                      "#3b1017",
                                    color:
                                      "#ff8a9b",
                                    fontSize:
                                      "10px",
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  KULÜP
                                </span>
                              )}

                              {post.is_pinned && (
                                <span
                                  style={{
                                    padding:
                                      "3px 7px",
                                    borderRadius:
                                      "999px",
                                    background:
                                      "#2a1519",
                                    color:
                                      "#ff647b",
                                    fontSize:
                                      "10px",
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  📌 SABİT
                                </span>
                              )}

                              <span
                                style={{
                                  color:
                                    "#666",
                                  fontSize:
                                    "12px",
                                }}
                              >
                                ·{" "}
                                {formatDate(
                                  post.created_at
                                )}
                              </span>
                            </div>

                            {post.profile
                              ?.username && (
                              <div
                                style={{
                                  color:
                                    "#666",
                                  fontSize:
                                    "12px",
                                  marginTop:
                                    "2px",
                                }}
                              >
                                @
                                {
                                  post
                                    .profile
                                    .username
                                }
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection:
                                "column",
                              alignItems:
                                "flex-end",
                              gap: "4px",
                              flex:
                                "0 0 auto",
                            }}
                          >
                            {currentProfile?.is_admin && (
                              <PaddockPinButton
                                postId={
                                  post.id
                                }
                                initialPinned={
                                  post.is_pinned
                                }
                              />
                            )}

                            {canDelete && (
                              <PaddockDeleteButton
                                postId={
                                  post.id
                                }
                              />
                            )}
                          </div>
                        </div>

                        {post.content && (
                          <div
                            style={{
                              marginTop:
                                "12px",
                              color: "#ddd",
                              lineHeight:
                                1.65,
                              whiteSpace:
                                "pre-wrap",
                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {post.content}
                          </div>
                        )}

                        <PostMediaGrid
                          media={post.media}
                        />

                        {post.poll && (
                          <PaddockPoll
                            poll={post.poll}
                          />
                        )}

                        <div
                          style={{
                            display: "flex",
                            gap: "28px",
                            marginTop:
                              "18px",
                            color: "#666",
                            fontSize:
                              "12px",
                            flexWrap:
                              "wrap",
                            alignItems:
                              "flex-start",
                          }}
                        >
                          <PaddockLikeButton
                            postId={post.id}
                            initialLikeCount={
                              post.like_count
                            }
                            initialLiked={
                              post.liked_by_current_user
                            }
                          />

                          <PaddockComments
                            postId={post.id}
                            initialCommentCount={
                              post.comment_count
                            }
                          />

                          <PaddockShareButton
                            postId={post.id}
                          />

                          <PaddockBookmarkButton
                            postId={post.id}
                            initialBookmarked={
                              post.bookmarked_by_current_user
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
            {(page > 1 || hasNextPage) && (
              <nav aria-label="Paddock sayfaları" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                gap: "12px", margin: "24px 0 6px", padding: "12px 0",
              }}>
                {page > 1 ? (
                  <Link href={paginationUrl(page - 1)} style={{ color: "#fff", background: "#1c1c1c", border: "1px solid #414141", borderRadius: 10, textDecoration: "none", padding: "12px 16px", fontSize: 13 }}>← Önceki</Link>
                ) : <span />}
                <span style={{ color: "#aaa", fontSize: 12 }}>{page}. sayfa</span>
                {hasNextPage ? (
                  <Link href={paginationUrl(page + 1)} style={{ color: "#fff", background: "#b71c31", borderRadius: 10, textDecoration: "none", padding: "12px 16px", fontWeight: 700, fontSize: 13 }}>Daha fazla gönderi →</Link>
                ) : <span />}
              </nav>
            )}
          </section>

          <aside
            style={{
              position: "sticky",
              top: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderRadius: "18px",
                border:
                  "1px solid #242424",
                background: "#0c0c0c",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: "18px",
                }}
              >
                Gündem
              </h2>

              {hashtags.length > 0 ? (
                hashtags.map(
                  ([tag, count], index) => (
                    <div
                      key={tag}
                      style={{
                        marginBottom:
                          "15px",
                      }}
                    >
                      <div
                        style={{
                          color: "#666",
                          fontSize:
                            "11px",
                        }}
                      >
                        {index + 1}.
                        Paddock gündemi
                      </div>

                      <strong>
                        {tag}
                      </strong>

                      <div
                        style={{
                          color: "#666",
                          fontSize:
                            "11px",
                        }}
                      >
                        {count} paylaşım
                      </div>
                    </div>
                  )
                )
              ) : (
                <div
                  style={{
                    color: "#666",
                    fontSize: "13px",
                  }}
                >
                  Hashtag kullanıldıkça
                  gündem burada oluşacak.
                </div>
              )}
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "18px",
                border:
                  "1px solid #242424",
                background: "#0c0c0c",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: "18px",
                }}
              >
                Kimi takip etmeli?
              </h2>

              {!user ? (
                <div
                  style={{
                    color: "#777",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  Kullanıcıları takip
                  etmek için giriş yap.
                </div>
              ) : suggestedProfiles.length ===
                0 ? (
                <div
                  style={{
                    color: "#777",
                    fontSize: "13px",
                  }}
                >
                  Şimdilik önerilecek
                  başka kullanıcı yok.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection:
                      "column",
                    gap: "18px",
                  }}
                >
                  {suggestedProfiles.map(
                    (profile) => {
                      const initialFollowing =
                        follows.some(
                          (follow) =>
                            follow.follower_id ===
                              user.id &&
                            follow.following_id ===
                              profile.id
                        );

                      const followerCount =
                        follows.filter(
                          (follow) =>
                            follow.following_id ===
                            profile.id
                        ).length;

                      return (
                        <div
                          key={profile.id}
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "10px",
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <Link href={`/members/${profile.id}`} aria-label="Önerilen üyenin profilini ziyaret et" style={{display:"block",flex:"0 0 auto"}}><div
                              style={{
                                width:
                                  "42px",
                                height:
                                  "42px",
                                borderRadius:
                                  "50%",
                                flex:
                                  "0 0 auto",
                                overflow:
                                  "hidden",
                                background:
                                  "#222",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  800,
                              }}
                            >
                              {profile.avatar_url ? (
                                <img
                                  src={
                                    profile.avatar_url
                                  }
                                  alt=""
                                  style={{
                                    width:
                                      "100%",
                                    height:
                                      "100%",
                                    objectFit:
                                      "cover",
                                  }}
                                />
                              ) : (
                                getInitials(
                                  profile
                                )
                              )}
                            </div></Link>

                            <div
                              style={{
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: "5px",
                                  alignItems:
                                    "center",
                                }}
                              >
                                <Link href={`/members/${profile.id}`} style={{color:"inherit",textDecoration:"none"}} aria-label="Profili ziyaret et"><strong
                                  style={{
                                    fontSize:
                                      "12px",
                                    overflow:
                                      "hidden",
                                    textOverflow:
                                      "ellipsis",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {profile.display_name ||
                                    profile.username ||
                                    "Kullanıcı"}
                                </strong></Link>

                                {profile.is_admin && (
                                  <span
                                    style={{
                                      color:
                                        "#ff647b",
                                      fontSize:
                                        "9px",
                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    KULÜP
                                  </span>
                                )}
                              </div>

                              {profile.username && (
                                <div
                                  style={{
                                    color:
                                      "#666",
                                    fontSize:
                                      "10px",
                                    marginTop:
                                      "2px",
                                  }}
                                >
                                  @
                                  {
                                    profile.username
                                  }
                                </div>
                              )}
                            </div>
                          </div>

                          <PaddockFollowButton
                            userId={
                              profile.id
                            }
                            initialFollowing={
                              initialFollowing
                            }
                            initialFollowerCount={
                              followerCount
                            }
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "18px",
                border:
                  "1px solid #242424",
                background: "#0c0c0c",
              }}
            >
              <div
                style={{
                  color: "#c51f32",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing:
                    "1.5px",
                  marginBottom: "8px",
                }}
              >
                SOSYAL AKIŞ
              </div>

              <strong
                style={{
                  fontSize: "14px",
                }}
              >
                Instagram
              </strong>

              <div
                style={{
                  color: "#666",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  marginTop: "7px",
                }}
              >
                Kulübün sosyal medya
                gönderilerini daha sonra
                buraya bağlayacağız.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}