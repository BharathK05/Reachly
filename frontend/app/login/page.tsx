"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Zap, UserPlus, LogIn, Brain, Sparkles, MessageSquare, ShieldCheck } from "lucide-react";

// ── Shared field styles ──────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)",
  letterSpacing: "0.06em", textTransform: "uppercase",
};

// ── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
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
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(from);
        router.refresh();
      } else {
        setError(data.message || "Incorrect email or password.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={fieldStyle}>
        <label htmlFor="login-email" style={labelStyle}>Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          className="input"
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="login-password" style={labelStyle}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            id="login-password"
            type={showPass ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="input"
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--accent-rose-dim)", border: "1px solid var(--accent-rose)", borderRadius: "var(--radius-sm)", color: "var(--accent-rose)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        id="login-submit-btn"
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={loading || !email.trim() || !password}
        style={{ width: "100%", marginTop: 4 }}
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : <><LogIn size={15} /> Sign In</>}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
        No account yet?{" "}
        <button type="button" onClick={onSwitch} style={{ background: "none", border: "none", color: "var(--accent-violet)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Create one
        </button>
      </p>
    </form>
  );
}

// ── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim() || !password) return;
    if (password !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={fieldStyle}>
        <label htmlFor="reg-company" style={labelStyle}>Company Name</label>
        <input
          id="reg-company"
          type="text"
          placeholder="e.g. Acme Corp"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          autoComplete="organization"
          autoFocus
          className="input"
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="reg-email" style={labelStyle}>Work Email</label>
        <input
          id="reg-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="input"
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="reg-password" style={labelStyle}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            id="reg-password"
            type={showPass ? "text" : "password"}
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="input"
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="reg-confirm" style={labelStyle}>Confirm Password</label>
        <input
          id="reg-confirm"
          type={showPass ? "text" : "password"}
          placeholder="Repeat your password"
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          autoComplete="new-password"
          className="input"
        />
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--accent-rose-dim)", border: "1px solid var(--accent-rose)", borderRadius: "var(--radius-sm)", color: "var(--accent-rose)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        id="register-submit-btn"
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={loading || !companyName.trim() || !email.trim() || !password || !confirmPass}
        style={{ width: "100%", marginTop: 4 }}
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : <><UserPlus size={15} /> Create Account</>}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} style={{ background: "none", border: "none", color: "var(--accent-violet)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── Auth Page Shell ──────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #090714 0%, #1a123a 50%, #090714 100%)",
      position: "relative",
      overflow: "hidden",
      padding: 20,
    }}>
      {/* Stunning Animated Background Orbs */}
      <div style={{ position:"absolute", top:"-10%", left:"-10%", width:"50vw", height:"50vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(124,92,252,0.3) 0%, transparent 70%)", filter:"blur(80px)", animation:"floatOrb 10s infinite ease-in-out alternate" }} />
      <div style={{ position:"absolute", bottom:"-10%", right:"-10%", width:"60vw", height:"60vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(77,166,255,0.2) 0%, transparent 70%)", filter:"blur(100px)", animation:"floatOrb 12s infinite ease-in-out alternate-reverse" }} />
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%, -50%)", width:"100%", height:"100%", backgroundImage:`radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize:"40px 40px", pointerEvents:"none" }} />

      <style>{`
        @keyframes floatOrb {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-40px) scale(1.05); }
        }
      `}</style>

      {/* Main Login Card */}
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "rgba(15, 12, 31, 0.6)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 32,
        padding: "48px 40px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
      }}>
        
        {/* Logo Header */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:32 }}>
          <div style={{
            width:56, height:56, borderRadius:16,
            background:"linear-gradient(135deg, #7c5cfc, #4da6ff)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 8px 24px rgba(124,92,252,0.4), inset 0 2px 4px rgba(255,255,255,0.3)",
            marginBottom:16,
          }}>
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:"1.8rem", fontWeight:800, color:"#fff", letterSpacing:"-0.02em", marginBottom:4 }}>
            Reachly
          </h1>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:12.5, letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600 }}>
            AI-Native CRM Platform
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)", padding: 4 }}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "var(--radius-xs)",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13.5,
                fontWeight: 600,
                transition: "all 0.2s ease",
                background: mode === m ? "linear-gradient(135deg, #7c5cfc, #6b4de0)" : "transparent",
                color: mode === m ? "white" : "rgba(255,255,255,0.5)",
                boxShadow: mode === m ? "0 4px 12px rgba(124,92,252,0.3)" : "none",
              }}
            >
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 28, textAlign:"center" }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Get started free"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            {mode === "login"
              ? "Sign in to your Reachly workspace"
              : "Create your company's AI-powered CRM"}
          </p>
        </div>

        {mode === "login"
          ? <LoginForm onSwitch={() => setMode("register")} />
          : <RegisterForm onSwitch={() => setMode("login")} />
        }

        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11.5, color: "rgba(255,255,255,0.3)" }}>
          Powered by <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>Reachly</span> · v1.0
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-base)" }} />}>
      <AuthPage />
    </Suspense>
  );
}
