import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { mrr, monthlyBurn, cashOnHand, growthRate, teamSize, stage } = await req.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
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

  const content = message.content[0];
  if (content.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 });

  try {
    return NextResponse.json(JSON.parse(content.text));
  } catch {
    return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
  }
}
