import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type MediaInput = {
  url: string;
  mediaType: "image" | "video";
};

type PollInput = {
  question: string;
  options: string[];
};

type ProfileData = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

type MediaData = {
  id: string;
  post_id: string;
  media_url: string;
  media_type: "image" | "video";
  sort_order: number;
};

type PollData = {
  id: string;
  post_id: string;
  question: string;
};

type PollOptionData = {
  id: string;
  poll_id: string;
  option_text: string;
  sort_order: number;
};

type PollVoteData = {
  poll_id: string;
  option_id: string;
};

function isValidPaddockMediaUrl(url: string) {
  return (
    (url.startsWith("http://") ||
      url.startsWith("https://")) &&
    url.includes(
      "/storage/v1/object/public/paddock-media/"
    )
  );
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const {
      data: rawPosts,
      error: postsError,
    } = await admin
      .from("paddock_posts")
      .select(
        `
          id,
          user_id,
          content,
          is_admin_post,
          is_pinned,
          is_published,
          created_at,
          updated_at
        `
      )
      .eq("is_published", true)
      .order("is_pinned", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (postsError) {
      console.error(
        "PADDOCK POSTS GET ERROR:",
        postsError
      );

      return NextResponse.json(
        {
          error:
            "Paddock gönderileri yüklenemedi.",
        },
        { status: 500 }
      );
    }

    const posts = rawPosts ?? [];

    const postIds = posts.map(
      (post) => post.id
    );

    const userIds = [
      ...new Set(
        posts.map(
          (post) => post.user_id
        )
      ),
    ];

    let profiles: ProfileData[] = [];
    let media: MediaData[] = [];
    let polls: PollData[] = [];
    let pollOptions: PollOptionData[] = [];
    let pollVotes: PollVoteData[] = [];

    if (userIds.length > 0) {
      const {
        data: profileData,
        error: profileError,
      } = await admin
        .from("profiles")
        .select(
          `
            id,
            username,
            display_name,
            avatar_url,
            is_admin
          `
        )
        .in("id", userIds);

      if (profileError) {
        console.error(
          "PADDOCK PROFILE GET ERROR:",
          profileError
        );
      } else {
        profiles =
          (profileData ??
            []) as ProfileData[];
      }
    }

    if (postIds.length > 0) {
      const {
        data: mediaData,
        error: mediaError,
      } = await admin
        .from("paddock_post_media")
        .select(
          `
            id,
            post_id,
            media_url,
            media_type,
            sort_order
          `
        )
        .in("post_id", postIds)
        .order("sort_order", {
          ascending: true,
        });

      if (mediaError) {
        console.error(
          "PADDOCK MEDIA GET ERROR:",
          mediaError
        );
      } else {
        media =
          (mediaData ??
            []) as MediaData[];
      }

      const {
        data: pollData,
        error: pollError,
      } = await admin
        .from("paddock_polls")
        .select(
          `
            id,
            post_id,
            question
          `
        )
        .in("post_id", postIds);

      if (pollError) {
        console.error(
          "PADDOCK POLLS GET ERROR:",
          pollError
        );
      } else {
        polls =
          (pollData ??
            []) as PollData[];
      }
    }

    const pollIds = polls.map(
      (poll) => poll.id
    );

    if (pollIds.length > 0) {
      const {
        data: optionData,
        error: optionError,
      } = await admin
        .from("paddock_poll_options")
        .select(
          `
            id,
            poll_id,
            option_text,
            sort_order
          `
        )
        .in("poll_id", pollIds)
        .order("sort_order", {
          ascending: true,
        });

      if (optionError) {
        console.error(
          "PADDOCK OPTIONS GET ERROR:",
          optionError
        );
      } else {
        pollOptions =
          (optionData ??
            []) as PollOptionData[];
      }

      const {
        data: voteData,
        error: voteError,
      } = await admin
        .from("paddock_poll_votes")
        .select(
          `
            poll_id,
            option_id
          `
        )
        .in("poll_id", pollIds);

      if (voteError) {
        console.error(
          "PADDOCK VOTES GET ERROR:",
          voteError
        );
      } else {
        pollVotes =
          (voteData ??
            []) as PollVoteData[];
      }
    }

    const result = posts.map((post) => {
      const profile =
        profiles.find(
          (profile) =>
            profile.id === post.user_id
        ) ?? null;

      const postMedia = media.filter(
        (item) =>
          item.post_id === post.id
      );

      const pollRow =
        polls.find(
          (poll) =>
            poll.post_id === post.id
        ) ?? null;

      let poll = null;

      if (pollRow) {
        const votesForPoll =
          pollVotes.filter(
            (vote) =>
              vote.poll_id ===
              pollRow.id
          );

        const options = pollOptions
          .filter(
            (option) =>
              option.poll_id ===
              pollRow.id
          )
          .map((option) => ({
            ...option,

            vote_count:
              votesForPoll.filter(
                (vote) =>
                  vote.option_id ===
                  option.id
              ).length,
          }));

        poll = {
          id: pollRow.id,
          question: pollRow.question,
          options,
          total_votes:
            votesForPoll.length,
        };
      }

      return {
        ...post,
        profile,
        media: postMedia,
        poll,
      };
    });

    return NextResponse.json({
      ok: true,
      posts: result,
    });
  } catch (error) {
    console.error(
      "PADDOCK POSTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Gönderi paylaşmak için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

    const incomingMedia: MediaInput[] =
      Array.isArray(body?.media)
        ? body.media
        : [];

    const incomingPoll:
      PollInput | null =
      body?.poll &&
      typeof body.poll === "object"
        ? body.poll
        : null;

    if (content.length > 1500) {
      return NextResponse.json(
        {
          error:
            "Gönderi en fazla 1500 karakter olabilir.",
        },
        { status: 400 }
      );
    }

    if (incomingMedia.length > 4) {
      return NextResponse.json(
        {
          error:
            "Bir gönderiye en fazla 4 medya ekleyebilirsin.",
        },
        { status: 400 }
      );
    }

    const cleanMedia: MediaInput[] = [];

    for (const item of incomingMedia) {
      if (
        !item ||
        typeof item.url !== "string" ||
        !item.url.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Geçersiz medya bilgisi.",
          },
          { status: 400 }
        );
      }

      if (
        item.mediaType !== "image" &&
        item.mediaType !== "video"
      ) {
        return NextResponse.json(
          {
            error:
              "Geçersiz medya türü.",
          },
          { status: 400 }
        );
      }

      const url =
        item.url.trim();

      if (
        !isValidPaddockMediaUrl(url)
      ) {
        return NextResponse.json(
          {
            error:
              "Geçersiz Paddock medya bağlantısı.",
          },
          { status: 400 }
        );
      }

      cleanMedia.push({
        url,
        mediaType:
          item.mediaType,
      });
    }

    let cleanPoll:
      PollInput | null = null;

    if (incomingPoll) {
      const question =
        typeof incomingPoll.question ===
        "string"
          ? incomingPoll.question.trim()
          : "";

      const rawOptions =
        Array.isArray(
          incomingPoll.options
        )
          ? incomingPoll.options
          : [];

      const options = rawOptions
        .filter(
          (option) =>
            typeof option === "string"
        )
        .map((option) =>
          option.trim()
        )
        .filter(
          (option) =>
            option.length > 0
        );

      if (!question) {
        return NextResponse.json(
          {
            error:
              "Anket sorusu boş olamaz.",
          },
          { status: 400 }
        );
      }

      if (question.length > 300) {
        return NextResponse.json(
          {
            error:
              "Anket sorusu en fazla 300 karakter olabilir.",
          },
          { status: 400 }
        );
      }

      if (
        options.length < 2 ||
        options.length > 4
      ) {
        return NextResponse.json(
          {
            error:
              "Ankette 2 ile 4 arasında seçenek olmalı.",
          },
          { status: 400 }
        );
      }

      if (
        options.some(
          (option) =>
            option.length > 120
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Anket seçenekleri en fazla 120 karakter olabilir.",
          },
          { status: 400 }
        );
      }

      const uniqueOptions =
        new Set(
          options.map((option) =>
            option.toLocaleLowerCase(
              "tr-TR"
            )
          )
        );

      if (
        uniqueOptions.size !==
        options.length
      ) {
        return NextResponse.json(
          {
            error:
              "Anket seçenekleri birbirinden farklı olmalı.",
          },
          { status: 400 }
        );
      }

      cleanPoll = {
        question,
        options,
      };
    }

    if (
      !content &&
      cleanMedia.length === 0 &&
      !cleanPoll
    ) {
      return NextResponse.json(
        {
          error:
            "Gönderi boş olamaz.",
        },
        { status: 400 }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select(
        `
          id,
          username,
          display_name,
          avatar_url,
          is_admin
        `
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        "PADDOCK PROFILE ERROR:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Kullanıcı profili bulunamadı.",
        },
        { status: 403 }
      );
    }

    const {
      data: createdPost,
      error: postError,
    } = await admin
      .from("paddock_posts")
      .insert({
        user_id: user.id,

        content:
          content || null,

        is_admin_post:
          Boolean(
            profile.is_admin
          ),

        is_pinned: false,

        is_published: true,
      })
      .select(
        `
          id,
          user_id,
          content,
          is_admin_post,
          is_pinned,
          is_published,
          created_at,
          updated_at
        `
      )
      .single();

    if (
      postError ||
      createdPost === null
    ) {
      console.error(
        "PADDOCK POST CREATE ERROR:",
        postError
      );

      return NextResponse.json(
        {
          error:
            postError?.message ||
            "Gönderi oluşturulamadı.",
        },
        { status: 500 }
      );
    }

    const createdPostId: string =
      createdPost.id;

    async function rollbackPost() {
      const {
        error: rollbackError,
      } = await admin
        .from("paddock_posts")
        .delete()
        .eq(
          "id",
          createdPostId
        );

      if (rollbackError) {
        console.error(
          "PADDOCK POST ROLLBACK ERROR:",
          rollbackError
        );
      }
    }

    let createdMedia:
      MediaData[] = [];

    if (cleanMedia.length > 0) {
      const mediaRows =
        cleanMedia.map(
          (item, index) => ({
            post_id:
              createdPostId,

            media_url:
              item.url,

            media_type:
              item.mediaType,

            sort_order:
              index,
          })
        );

      const {
        data: mediaData,
        error: mediaError,
      } = await admin
        .from("paddock_post_media")
        .insert(mediaRows)
        .select(
          `
            id,
            post_id,
            media_url,
            media_type,
            sort_order
          `
        );

      if (mediaError) {
        console.error(
          "PADDOCK MEDIA CREATE ERROR:",
          mediaError
        );

        await rollbackPost();

        return NextResponse.json(
          {
            error:
              mediaError.message ||
              "Gönderi medyası kaydedilemedi.",
          },
          { status: 500 }
        );
      }

      createdMedia =
        (mediaData ??
          []) as MediaData[];
    }

    let createdPoll:
      {
        id: string;
        question: string;
        options: Array<
          PollOptionData & {
            vote_count: number;
          }
        >;
        total_votes: number;
      } | null = null;

    if (cleanPoll) {
      const {
        data: createdPollRow,
        error: pollError,
      } = await admin
        .from("paddock_polls")
        .insert({
          post_id:
            createdPostId,

          question:
            cleanPoll.question,
        })
        .select(
          `
            id,
            post_id,
            question
          `
        )
        .single();

      if (
        pollError ||
        createdPollRow === null
      ) {
        console.error(
          "PADDOCK POLL CREATE ERROR:",
          pollError
        );

        await rollbackPost();

        return NextResponse.json(
          {
            error:
              pollError?.message ||
              "Anket oluşturulamadı.",
          },
          { status: 500 }
        );
      }

      const createdPollId: string =
        createdPollRow.id;

      const optionRows =
        cleanPoll.options.map(
          (option, index) => ({
            poll_id:
              createdPollId,

            option_text:
              option,

            sort_order:
              index,
          })
        );

      const {
        data: optionData,
        error: optionError,
      } = await admin
        .from(
          "paddock_poll_options"
        )
        .insert(optionRows)
        .select(
          `
            id,
            poll_id,
            option_text,
            sort_order
          `
        );

      if (optionError) {
        console.error(
          "PADDOCK POLL OPTIONS CREATE ERROR:",
          optionError
        );

        await rollbackPost();

        return NextResponse.json(
          {
            error:
              optionError.message ||
              "Anket seçenekleri oluşturulamadı.",
          },
          { status: 500 }
        );
      }

      const createdOptions =
        (optionData ??
          []) as PollOptionData[];

      createdPoll = {
        id:
          createdPollId,

        question:
          createdPollRow.question,

        options:
          createdOptions.map(
            (option) => ({
              ...option,
              vote_count: 0,
            })
          ),

        total_votes: 0,
      };
    }

    return NextResponse.json(
      {
        ok: true,

        post: {
          ...createdPost,
          profile,
          media:
            createdMedia,
          poll:
            createdPoll,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "PADDOCK POST CREATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}