"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ForecastMonth { month: number; label: string; mrr: number; burn: number; cash: number; }
interface Recommendation { category: string; action: string; impact: string; urgency: string; }
interface Analysis {
  runwayMonths: number; burnMultiple: number; netBurn: number; defaultAlive: boolean; verdict: string;
  recommendations: Recommendation[]; forecast: ForecastMonth[]; keyRisks: string[];
}

const urgencyColor: Record<string, string> = { immediate: "bg-red-100 text-red-700", soon: "bg-yellow-100 text-yellow-700", planned: "bg-blue-100 text-blue-700" };
const catColor: Record<string, string> = { Revenue: "bg-green-100 text-green-700", Costs: "bg-orange-100 text-orange-700", Fundraising: "bg-purple-100 text-purple-700", Hiring: "bg-blue-100 text-blue-700" };

function fmt(n: number) { return n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`; }

export default function Home() {
  const [form, setForm] = useState({ mrr: "50000", monthlyBurn: "80000", cashOnHand: "500000", growthRate: "8", teamSize: "10", stage: "Seed" });
  const [result, setResult] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function analyze() {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/analyze-finances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Unknown error"); }
    finally { setLoading(false); }
  }

  const runwayColor = !result ? "" : result.runwayMonths >= 18 ? "text-green-400" : result.runwayMonths >= 12 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">$</div>
          <div>
            <h1 className="text-lg font-semibold">Startup Finance Copilot</h1>
            <p className="text-xs text-slate-400">Runway, burn analysis and growth forecasting</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Financial Snapshot</CardTitle>
            <CardDescription className="text-slate-400">Enter your current metrics for instant analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "mrr", label: "Monthly Revenue (MRR)", placeholder: "50000" },
                { key: "monthlyBurn", label: "Monthly Burn", placeholder: "80000" },
                { key: "cashOnHand", label: "Cash on Hand", placeholder: "500000" },
                { key: "growthRate", label: "MoM Growth Rate (%)", placeholder: "8" },
                { key: "teamSize", label: "Team Size", placeholder: "10" },
                { key: "stage", label: "Stage", placeholder: "Seed" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-slate-300">{label}</Label>
                  <Input
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={e => set(key, e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button onClick={analyze} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
              {loading ? "Analyzing..." : "Analyze Financials"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Runway", value: `${result.runwayMonths}mo`, color: runwayColor },
                { label: "Net Burn", value: fmt(result.netBurn), color: "text-orange-400" },
                { label: "Burn Multiple", value: result.burnMultiple.toFixed(1) + "x", color: result.burnMultiple <= 1.5 ? "text-green-400" : result.burnMultiple <= 2.5 ? "text-yellow-400" : "text-red-400" },
                { label: "Default Alive", value: result.defaultAlive ? "Yes" : "No", color: result.defaultAlive ? "text-green-400" : "text-red-400" },
              ].map((m, i) => (
                <Card key={i} className="bg-slate-900 border-slate-800 text-center py-4">
                  <div className={`text-3xl font-bold ${m.color}`}>{m.value}</div>
                  <div className="text-slate-400 text-sm mt-1">{m.label}</div>
                </Card>
              ))}
            </div>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4">
                <p className="text-slate-300 italic">&quot;{result.verdict}&quot;</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-white">Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge className={catColor[rec.category] || "bg-slate-700 text-slate-300"}>{rec.category}</Badge>
                      <Badge className={urgencyColor[rec.urgency] || "bg-slate-700 text-slate-300"}>{rec.urgency}</Badge>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{rec.action}</p>
                      <p className="text-slate-400 text-xs mt-1">{rec.impact}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader><CardTitle className="text-white">12-Month Forecast</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-2">Month</th>
                        <th className="text-right py-2">MRR</th>
                        <th className="text-right py-2">Burn</th>
                        <th className="text-right py-2">Cash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.forecast.map((m, i) => (
                        <tr key={i} className={`border-b border-slate-800 ${m.cash < 0 ? "text-red-400" : "text-slate-300"}`}>
                          <td className="py-2">{m.label}</td>
                          <td className="text-right">{fmt(m.mrr)}</td>
                          <td className="text-right">{fmt(m.burn)}</td>
                          <td className="text-right font-medium">{fmt(m.cash)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {result.keyRisks.length > 0 && (
              <Card className="bg-red-900/20 border-red-800">
                <CardHeader><CardTitle className="text-red-400">Key Risks</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.keyRisks.map((r, i) => <li key={i} className="text-red-300 text-sm flex gap-2"><span>!</span>{r}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
