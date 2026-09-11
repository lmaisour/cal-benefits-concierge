import { NextResponse } from "next/server";
import { toMatchResponse } from "@/lib/eligibility/consumer-match";
import { matchPrograms } from "@/lib/eligibility/match-programs";
import { sanitizeFollowupAnswers } from "@/lib/eligibility/validate-followup";
import { validateUserProfile } from "@/lib/eligibility/validate-profile";
import { getMatchableProgramData } from "@/lib/programs/get-matchable-program-data";

export const dynamic = "force-dynamic";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isPlainObject(body) || !("profile" in body)) {
    return NextResponse.json(
      { error: "A profile object is required." },
      { status: 400 },
    );
  }

  const validated = validateUserProfile(body.profile);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const data = await getMatchableProgramData();
    const followupAnswers = sanitizeFollowupAnswers(
      body.followupAnswers,
      data.followupQuestions,
    );
    const evaluated = matchPrograms(
      data.programs,
      data.rules,
      data.locations,
      validated.profile,
      {
        questions: data.followupQuestions,
        rules: data.followupRules,
        answersByProgramId: followupAnswers,
      },
    );
    return NextResponse.json(
      toMatchResponse(evaluated, {
        questions: data.followupQuestions,
        answersByProgramId: followupAnswers,
      }),
    );
  } catch {
    console.error("Match request failed");
    return NextResponse.json(
      { error: "We couldn’t check your matches right now." },
      { status: 500 },
    );
  }
}
