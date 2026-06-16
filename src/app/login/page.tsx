"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Credenciales inválidas");
        return;
      }
      localStorage.setItem("token", data.access_token as string);
      router.replace("/dashboard");
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) router.replace("/dashboard");
  }, [router]);

  const bullets = [
    {
      icon: "⚡",
      title: "Sincronización automática",
      desc: "Tu información de Siigo Nube, siempre actualizada sin intervención manual.",
    },
    {
      icon: "📊",
      title: "Reportes listos para leer",
      desc: "Ventas, cartera, indicadores y PyG en dashboards visuales claros.",
    },
    {
      icon: "🚀",
      title: "Decisiones en tiempo real",
      desc: "Sin esperar al contador. Sin procesar Excel. Solo información lista para actuar.",
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* ── PANEL IZQUIERDO ── */}
      <div
        style={{
          flex: "0 0 58%",
          background: "#0D1B2E",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 64px",
          overflow: "hidden",
        }}
      >
        {/* Dot pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(37,99,235,0.18) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            pointerEvents: "none",
          }}
        />

        {/* Glow azul fondo */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-80px",
            width: "480px",
            height: "480px",
            background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            right: "-60px",
            width: "360px",
            height: "360px",
            background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Contenido */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "480px" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "52px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "34px" }}>
              <span style={{ display: "block", width: "5px", height: "14px", borderRadius: "3px", background: "#60A5FA" }} />
              <span style={{ display: "block", width: "5px", height: "22px", borderRadius: "3px", background: "#3B82F6" }} />
              <span style={{ display: "block", width: "5px", height: "34px", borderRadius: "3px", background: "#2563EB" }} />
              <span style={{ display: "block", width: "5px", height: "20px", borderRadius: "3px", background: "#7C3AED" }} />
            </div>
            <span style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              Insights<span style={{ color: "#3B82F6" }}>Flow</span>
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#fff",
              marginBottom: "16px",
            }}
          >
            Tu empresa,<br />
            <span style={{ color: "#3B82F6" }}>visible en tiempo real.</span>
          </h1>

          <p
            style={{
              fontSize: "1rem",
              color: "#94A3B8",
              lineHeight: 1.7,
              marginBottom: "44px",
            }}
          >
            Conecta Siigo Nube y accede a reportes ejecutivos, indicadores financieros y dashboards listos para tomar decisiones — sin esperar a nadie.
          </p>

          {/* Divider */}
          <div
            style={{
              width: "48px",
              height: "2px",
              background: "linear-gradient(90deg, #2563EB, #10B981)",
              borderRadius: "2px",
              marginBottom: "36px",
            }}
          />

          {/* Bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {bullets.map((b) => (
              <div key={b.title} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(37,99,235,0.15)",
                    border: "1px solid rgba(37,99,235,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    flexShrink: 0,
                  }}
                >
                  {b.icon}
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#E2E8F0", marginBottom: "4px" }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#64748B", lineHeight: 1.6 }}>
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Badge empresa */}
          <div
            style={{
              marginTop: "52px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: "50px",
              padding: "7px 14px",
              fontSize: "0.72rem",
              color: "#10B981",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
            Conectado a Siigo Nube · Impocommerce SAS
          </div>

        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div
        style={{
          flex: 1,
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 32px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "380px" }}>

          {/* Encabezado form */}
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>
              Iniciar sesión
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#64748B" }}>
              Ingresa tus credenciales para acceder al panel.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "#DC2626",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit}>

            {/* Usuario */}
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="email"
                style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}
              >
                Usuario
              </label>
              <input
                id="email"
                type="text"
                placeholder="Correo o usuario"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  background: "#fff",
                  fontSize: "0.9rem",
                  color: "#111827",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
              />
            </div>

            {/* Contraseña */}
            <div style={{ marginBottom: "24px" }}>
              <label
                htmlFor="password"
                style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}
              >
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 44px 10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    background: "#fff",
                    fontSize: "0.9rem",
                    color: "#111827",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
                  onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#9CA3AF",
                  }}
                >
                  {showPwd ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" d="M3 3l18 18M10.58 10.58A3 3 0 0113.42 13.4M9.88 4.24A9.76 9.76 0 0112 4c6 0 10 8 10 8a15.7 15.7 0 01-4.06 5.18M6.1 6.1A15.77 15.77 0 002 12s4 8 10 8a9.82 9.82 0 003.2-.52" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: loading ? "#93C5FD" : "#2563EB",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s, transform 0.15s",
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = "#1D4ED8"); }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget.style.background = "#2563EB"); }}
            >
              {loading ? "Ingresando..." : "Iniciar sesión →"}
            </button>

          </form>

          {/* Footer form */}
          <p style={{ marginTop: "28px", fontSize: "0.72rem", color: "#9CA3AF", textAlign: "center" }}>
            © {new Date().getFullYear()} Impocommerce SAS · InsightsFlow
          </p>

        </div>
      </div>

      {/* Responsive: ocultar panel izquierdo en móvil */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="flex: 0 0 58%"] { display: none !important; }
          div[style*="background: #F8FAFC"] { background: #0D1B2E !important; }
          input { color: #111827 !important; }
        }
      `}</style>

    </div>
  );
}
