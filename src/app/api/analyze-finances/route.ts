import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { capMaxTokens, formatZodError, guardDemoRequest, MAX_OUTPUT_TOKENS } from "@/lib/demo-guard";
import { FINANCE_FIELD_LIMITS } from "@/lib/finance-limits";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const money = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^\d+(\.\d+)?$/, "must be a non-negative number");

const bodySchema = z
  .object({
    mrr: money(FINANCE_FIELD_LIMITS.mrr),
    monthlyBurn: money(FINANCE_FIELD_LIMITS.monthlyBurn),
    cashOnHand: money(FINANCE_FIELD_LIMITS.cashOnHand),
    growthRate: z
      .string()
      .trim()
      .min(1)
      .max(FINANCE_FIELD_LIMITS.growthRate)
      .regex(/^-?\d+(\.\d+)?$/, "must be a number"),
    teamSize: z
      .string()
      .trim()
      .min(1)
      .max(FINANCE_FIELD_LIMITS.teamSize)
      .regex(/^\d+$/, "must be a whole number"),
    stage: z.string().trim().min(1).max(FINANCE_FIELD_LIMITS.stage),
  })
  .strict();

const MAX_BODY_CHARS =
  FINANCE_FIELD_LIMITS.mrr +
  FINANCE_FIELD_LIMITS.monthlyBurn +
  FINANCE_FIELD_LIMITS.cashOnHand +
  FINANCE_FIELD_LIMITS.growthRate +
  FINANCE_FIELD_LIMITS.teamSize +
  FINANCE_FIELD_LIMITS.stage +
  1_000;

export async function POST(req: NextRequest) {
  const blocked = await guardDemoRequest(req);
  if (blocked) return blocked;

  let json: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 400 });
    }
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { mrr, monthlyBurn, cashOnHand, growthRate, teamSize, stage } = parsed.data;

  let message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: capMaxTokens(MAX_OUTPUT_TOKENS),
      messages: [
        {
          role: "user",
          content: `You are a startup CFO. Analyze these financials and provide actionable insights.

MRR: $${mrr}
Monthly Burn: $${monthlyBurn}
Cash on Hand: $${cashOnHand}
MoM Growth Rate: ${growthRate}%
Team Size: ${teamSize}
Stage: ${stage}

Return ONLY this JSON:
{
  "runwayMonths": 12,
  "burnMultiple": 1.5,
  "netBurn": 30000,
  "defaultAlive": false,
  "verdict": "one sentence overall assessment",
  "recommendations": [
    { "category": "Revenue", "action": "specific action", "impact": "expected impact", "urgency": "immediate" }
  ],
  "forecast": [
    { "month": 1, "label": "Jun 2025", "mrr": 50000, "burn": 80000, "cash": 470000 }
  ],
  "keyRisks": ["top 3 financial risks"]
}

category must be one of: Revenue, Costs, Fundraising, Hiring
urgency must be one of: immediate, soon, planned
Generate forecast for all 12 months. Calculate: cash = previous_cash - (burn - mrr) each month. mrr grows at ${growthRate}% per month. burn stays flat.
netBurn = monthlyBurn - mrr`,
        },
      ],
    });
  } catch {
    // Do not log this error. Provider failures can echo request metadata.
    return NextResponse.json({ error: "The analysis request could not be completed" }, { status: 502 });
  }

  const content = message.content[0];
  if (!content || content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  try {
    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return NextResponse.json(JSON.parse(jsonStr));
  } catch {
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
