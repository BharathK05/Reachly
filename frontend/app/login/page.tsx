"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(from);
        router.refresh();
      } else {
        setError("Incorrect email or password. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "var(--bg-base)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Left branding panel */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
        position: "relative",
        background: "linear-gradient(160deg, #0a0818 0%, #13103a 50%, #0a0818 100%)",
      }}>
        {/* Glow effects */}
        <div style={{ position:"absolute", top:-120, left:-120, width:480, height:480, borderRadius:"50%", background:"radial-gradient(circle, rgba(124,92,252,0.2) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, right:-80, width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle, rgba(77,166,255,0.12) 0%, transparent 70%)", pointerEvents:"none" }} />

        <div style={{ textAlign:"center", zIndex:1 }}>
          {/* Logo */}
          <div style={{
            width:80, height:80, borderRadius:20,
            background:"linear-gradient(135deg, #7c5cfc, #4da6ff)",
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 28px",
            boxShadow:"0 0 0 12px rgba(124,92,252,0.12), 0 16px 48px rgba(124,92,252,0.4)",
          }}>
            <Zap size={38} color="white" />
          </div>

          <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:"2.4rem", fontWeight:800, color:"#fff", letterSpacing:"-0.02em", marginBottom:10 }}>
            Reachly
          </h1>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13.5, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:48 }}>
            AI-Native CRM Platform
          </p>

          {/* Feature pills */}
          {["5 AI agents. One goal.", "Real-time campaign delivery.", "Natural language targeting."].map((t) => (
            <div key={t} style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"8px 18px", borderRadius:99,
              background:"rgba(124,92,252,0.12)",
              border:"1px solid rgba(124,92,252,0.25)",
              color:"rgba(255,255,255,0.75)",
              fontSize:13, fontWeight:500,
              marginBottom:10, width:"100%", justifyContent:"center",
            }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#7c5cfc" }} />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right login form panel */}
      <div style={{
        width:440, flexShrink:0,
        background:"var(--bg-surface)",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"56px 48px",
        borderLeft:"1px solid var(--border)",
      }}>
        <div style={{ width:"100%", maxWidth:340 }}>
          <div style={{ marginBottom:36 }}>
            <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:"1.5rem", fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.02em", marginBottom:6 }}>
              Sign in
            </h2>
            <p style={{ color:"var(--text-secondary)", fontSize:13.5 }}>
              Access your Reachly workspace
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {/* Email */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label htmlFor="login-email" style={{ fontSize:11.5, fontWeight:600, color:"var(--text-secondary)", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="input"
              />
            </div>

            {/* Password */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label htmlFor="login-password" style={{ fontSize:11.5, fontWeight:600, color:"var(--text-secondary)", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                Password
              </label>
              <div style={{ position:"relative" }}>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="input"
                  style={{ paddingRight:40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", padding:4, display:"flex" }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding:"10px 14px", background:"var(--accent-rose-dim)", border:"1px solid var(--accent-rose)", borderRadius:"var(--radius-sm)", color:"var(--accent-rose)", fontSize:13 }}>
                {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !email.trim() || !password}
              style={{ width:"100%", marginTop:4 }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                : "Sign In"
              }
            </button>
          </form>

          <p style={{ marginTop:32, textAlign:"center", fontSize:11.5, color:"var(--text-muted)" }}>
            Powered by <span style={{ fontWeight:700, color:"var(--text-secondary)" }}>Reachly</span> · v1.0
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", background:"var(--bg-base)" }} />}>
      <LoginForm />
    </Suspense>
  );
}
