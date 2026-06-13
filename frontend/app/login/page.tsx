"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Zap, UserPlus, LogIn } from "lucide-react";

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
          {["5 AI agents. One goal.", "Real-time campaign delivery.", "Natural language targeting.", "Multi-tenant & secure."].map((t) => (
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

      {/* Right form panel */}
      <div style={{
        width: 460,
        flexShrink: 0,
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 48px",
        borderLeft: "1px solid var(--border)",
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "var(--bg-card)", borderRadius: "var(--radius-sm)", padding: 4 }}>
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: "var(--radius-xs)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  background: mode === m ? "var(--accent-violet)" : "transparent",
                  color: mode === m ? "white" : "var(--text-secondary)",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 6 }}>
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

          <p style={{ marginTop: 32, textAlign: "center", fontSize: 11.5, color: "var(--text-muted)" }}>
            Powered by <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Reachly</span> · v1.0
          </p>
        </div>
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
