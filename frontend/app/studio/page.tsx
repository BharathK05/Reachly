"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wand2,
  DollarSign,
  Zap,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createCampaign } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";



const BUDGET_PRESETS = [
  { label: "₹2K", value: 2000 },
  { label: "₹5K", value: 5000 },
  { label: "₹10K", value: 10000 },
  { label: "₹25K", value: 25000 },
];

export default function StudioPage() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useCurrentUser();
  const companyName = user?.company_name || "your company";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const goalParam = params.get("goal");
      if (goalParam) {
        setGoal(goalParam);
      }
    }
  }, []);

  const goalSuggestions = [
    "Re-engage customers who haven't visited in 45+ days",
    `Boost ${companyName} Gold tier loyalty with an exclusive offer`,
    `Promote our new ${companyName} range to frequent buyers`,
    "Win back high-spend customers with a premium discount",
  ];



  const handleLaunch = async () => {
    if (!goal.trim()) { setError("Please describe your campaign goal."); return; }
    if (!budget || Number(budget) <= 0) { setError("Please enter a valid budget."); return; }
    setError(null);
    setLoading(true);
    try {
      const { id } = await createCampaign(goal.trim(), Number(budget), name.trim() || undefined);
      router.push(`/timeline/${id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create campaign.");
      setLoading(false);
    }
  };

  return (
    <div className="page-content-focused">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--accent-violet), var(--accent-green))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Wand2 size={20} color="white" />
          </div>
          <h1 className="page-title">Campaign Studio</h1>
        </div>
        <p className="page-subtitle">
          Describe your goal in plain English. Reachly's AI agents will handle strategy, audience, content, channel, and predictions automatically.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        {/* Campaign Name */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="label" htmlFor="campaign-name-input">
            Campaign Name <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="campaign-name-input"
            type="text"
            className="input"
            placeholder="e.g. June Reactivation Drive, Cold Brew Launch…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </div>

        {/* Goal Input */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="label" htmlFor="goal-input">
            Campaign Goal
          </label>
          <textarea
            id="goal-input"
            className="input"
            placeholder="e.g. Re-engage customers who haven't visited in 45+ days with a 20% discount…"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{ minHeight: 110 }}
          />

          {/* Suggestion Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {goalSuggestions.map((s) => (
              <button
                key={s}
                className={`chip ${goal === s ? "active" : ""}`}
                onClick={() => setGoal(s)}
                aria-label={`Use suggestion: ${s}`}
              >
                <Zap size={11} />
                {s.length > 44 ? s.slice(0, 44) + "…" : s}
              </button>
            ))}
          </div>


        </div>

        {/* Budget Input */}
        <div className="form-group" style={{ marginBottom: 28 }}>
          <label className="label" htmlFor="budget-input">
            <DollarSign size={11} style={{ display: "inline", marginRight: 4 }} />
            Campaign Budget (₹)
          </label>
          <input
            id="budget-input"
            type="number"
            className="input"
            placeholder="Enter budget in INR"
            value={budget}
            onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : "")}
            min={0}
          />

          {/* Budget Quick-Select */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {BUDGET_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                className={`chip ${budget === value ? "active" : ""}`}
                onClick={() => setBudget(value)}
                aria-label={`Set budget to ${label}`}
                id={`budget-preset-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--accent-rose-dim)",
              borderRadius: "var(--radius-sm)",
              color: "var(--accent-rose)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          id="launch-campaign-btn"
          className="btn btn-primary btn-lg"
          onClick={handleLaunch}
          disabled={loading || !goal.trim() || !budget}
          style={{ width: "100%" }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Creating Campaign…
            </>
          ) : (
            <>
              <Zap size={18} />
              Generate Campaign Draft
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* How it works */}
      <div className="card" style={{ background: "var(--accent-violet-dim)", borderColor: "rgba(124,92,252,0.2)" }}>
        <h2 style={{ marginBottom: 16, color: "var(--text-primary)", fontSize: 14 }}>
          How the AI agents work
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { step: "1", title: "Strategy", desc: "Classifies your goal and defines campaign approach" },
            { step: "2", title: "Audience", desc: "Queries your customer database with AI-derived filters" },
            { step: "3", title: "Content", desc: "Generates a personalized message with a discount code" },
            { step: "4", title: "Channel", desc: "Picks WhatsApp / SMS / Email based on your budget" },
            { step: "5", title: "Prediction", desc: "Forecasts open rate, CTR, and conversions" },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "var(--accent-violet)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {step}
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{title}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
