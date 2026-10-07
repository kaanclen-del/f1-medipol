import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      pollId: string;
    }>;
  }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Oy vermek için giriş yapmalısın.",
        },
        { status: 401 }
      );
    }

    const { pollId } = await context.params;

    if (!pollId) {
      return NextResponse.json(
        {
          error: "Anket ID bulunamadı.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const optionId =
      typeof body.optionId === "string"
        ? body.optionId.trim()
        : "";

    if (!optionId) {
      return NextResponse.json(
        {
          error: "Bir seçenek seçmelisin.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: poll, error: pollError } =
      await admin
        .from("paddock_polls")
        .select("id")
        .eq("id", pollId)
        .single();

    if (pollError || !poll) {
      return NextResponse.json(
        {
          error: "Anket bulunamadı.",
        },
        { status: 404 }
      );
    }

    const {
      data: option,
      error: optionError,
    } = await admin
      .from("paddock_poll_options")
      .select("id, poll_id")
      .eq("id", optionId)
      .eq("poll_id", pollId)
      .single();

    if (optionError || !option) {
      return NextResponse.json(
        {
          error:
            "Geçersiz anket seçeneği.",
        },
        { status: 400 }
      );
    }

    const {
      data: existingVote,
      error: existingVoteError,
    } = await admin
      .from("paddock_poll_votes")
      .select("id, option_id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVoteError) {
      console.error(
        "POLL EXISTING VOTE ERROR:",
        existingVoteError
      );

      return NextResponse.json(
        {
          error:
            "Oy bilgisi kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    if (existingVote) {
      return NextResponse.json(
        {
          error:
            "Bu ankette daha önce oy kullandın.",
          optionId:
            existingVote.option_id,
        },
        { status: 409 }
      );
    }

    const { data: vote, error: voteError } =
      await admin
        .from("paddock_poll_votes")
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id,
        })
        .select()
        .single();

    if (voteError) {
      console.error(
        "POLL VOTE CREATE ERROR:",
        voteError
      );

      return NextResponse.json(
        {
          error:
            voteError.message ||
            "Oy kaydedilemedi.",
        },
        { status: 500 }
      );
    }

    const { data: allVotes, error: countError } =
      await admin
        .from("paddock_poll_votes")
        .select("option_id")
        .eq("poll_id", pollId);

    if (countError) {
      console.error(
        "POLL VOTE COUNT ERROR:",
        countError
      );
    }

    const counts: Record<string, number> = {};

    for (const item of allVotes ?? []) {
      counts[item.option_id] =
        (counts[item.option_id] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      vote,
      selectedOptionId: optionId,
      totalVotes:
        allVotes?.length ?? 1,
      counts,
    });
  } catch (error) {
    console.error(
      "POLL VOTE ERROR:",
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