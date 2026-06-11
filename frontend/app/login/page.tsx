"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(from);
        router.refresh();
      } else {
        setError("Incorrect username or password. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#0d1f14",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left panel — branding */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          position: "relative",
          background: "linear-gradient(160deg, #0d1f14 0%, #1a3a22 50%, #0d1f14 100%)",
        }}
      >
        {/* Background circles */}
        <div style={{ position: "absolute", top: -120, left: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,112,74,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,168,107,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Starbucks logo mark */}
        <div style={{ textAlign: "center", zIndex: 1 }}>
          <div
            style={{
              width: 90, height: 90,
              borderRadius: "50%",
              background: "#00704A",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: "0 0 0 8px rgba(0,112,74,0.15), 0 16px 48px rgba(0,112,74,0.35)",
            }}
          >
            {/* Starbucks star / siren silhouette via text */}
            <svg width="46" height="46" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L9.1 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.9 8.26L12 2Z"/>
            </svg>
          </div>

          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "2.2rem", fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              marginBottom: 8,
            }}
          >
            Starbucks India
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Partner Portal
          </p>

          <div
            style={{
              marginTop: 48,
              padding: "20px 28px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              maxWidth: 320,
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13.5, lineHeight: 1.7, fontStyle: "italic" }}>
              "Every cup is a connection. Every campaign is a conversation."
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11.5, marginTop: 12, letterSpacing: "0.06em" }}>
              — REACHLY AI PLATFORM
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div
        style={{
          width: 440,
          flexShrink: 0,
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 340 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "1.5rem", fontWeight: 800,
                color: "#1a1a1a",
                letterSpacing: "-0.02em",
                marginBottom: 6,
              }}
            >
              Sign in
            </h2>
            <p style={{ color: "#888", fontSize: 13.5 }}>
              Enter your credentials to access the platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                htmlFor="login-username"
                style={{ fontSize: 12, fontWeight: 600, color: "#444", letterSpacing: "0.05em", textTransform: "uppercase" }}
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                style={{
                  width: "100%", padding: "11px 14px",
                  border: "1.5px solid #e5e5e5", borderRadius: 8,
                  fontSize: 14, color: "#1a1a1a",
                  outline: "none", fontFamily: "Inter, sans-serif",
                  background: "#fafafa",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#00704A"; e.target.style.boxShadow = "0 0 0 3px rgba(0,112,74,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e5e5"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                htmlFor="login-password"
                style={{ fontSize: 12, fontWeight: 600, color: "#444", letterSpacing: "0.05em", textTransform: "uppercase" }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: "100%", padding: "11px 40px 11px 14px",
                    border: "1.5px solid #e5e5e5", borderRadius: 8,
                    fontSize: 14, color: "#1a1a1a",
                    outline: "none", fontFamily: "Inter, sans-serif",
                    background: "#fafafa",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#00704A"; e.target.style.boxShadow = "0 0 0 3px rgba(0,112,74,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e5e5"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#aaa", padding: 4, display: "flex",
                  }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: "10px 14px",
                background: "#fff1f3",
                border: "1px solid #ffb3be",
                borderRadius: 8,
                color: "#c0152a",
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading || !username.trim() || !password}
              style={{
                width: "100%",
                padding: "13px",
                background: loading || !username.trim() || !password
                  ? "#ccc"
                  : "#00704A",
                color: "white",
                border: "none", borderRadius: 8,
                fontSize: 14.5, fontWeight: 700,
                cursor: loading || !username.trim() || !password ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.2s, transform 0.15s",
                marginTop: 4,
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#005a3c"; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#00704A"; }}
            >
              {loading ? (
                <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Signing in…</>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ marginTop: 32, textAlign: "center", fontSize: 11.5, color: "#bbb" }}>
            Powered by{" "}
            <span style={{ fontWeight: 700, color: "#888" }}>Reachly</span>
            {" "}· AI-Native CRM Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0d1f14" }} />}>
      <LoginForm />
    </Suspense>
  );
}
