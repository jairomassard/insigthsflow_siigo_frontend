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
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
        </svg>
      ),
      title: "Información organizada",
      desc: "Centralice y consulte información financiera y operativa desde reportes ejecutivos y dashboards visuales.",
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" d="M4 20V10M12 20V4M20 20v-7" />
        </svg>
      ),
      title: "Reportes para la gerencia",
      desc: "Analice ventas, cartera, compras, gastos, indicadores y estados financieros desde una visión más clara.",
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="7" strokeWidth="2" />
          <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.3-4.3M9 8v3l2 2" />
        </svg>
      ),
      title: "Análisis financiero avanzado",
      desc: "Profundice en reportes estratégicos mediante análisis con IA para identificar relaciones, variaciones y puntos que merecen atención.",
    },
  ];

  const Logo = ({ size = "1.45rem", barHeight = 30, textColor = "#fff" }: { size?: string; barHeight?: number; textColor?: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: `${barHeight}px` }}>
        <span style={{ display: "block", width: "5px", height: `${barHeight * 0.4}px`, borderRadius: "3px", background: "#60A5FA" }} />
        <span style={{ display: "block", width: "5px", height: `${barHeight * 0.63}px`, borderRadius: "3px", background: "#3B82F6" }} />
        <span style={{ display: "block", width: "5px", height: `${barHeight}px`, borderRadius: "3px", background: "#2563EB" }} />
        <span style={{ display: "block", width: "5px", height: `${barHeight * 0.57}px`, borderRadius: "3px", background: "#7C3AED" }} />
      </div>
      <span style={{ fontSize: size, fontWeight: 700, color: textColor, letterSpacing: "-0.02em" }}>
        Insights<span style={{ color: "#3B82F6" }}>Flow</span>
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", maxHeight: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }} className="if-login-root">

      {/* ── PANEL IZQUIERDO (desktop) ── */}
      <div className="if-login-left" style={{ flex: "0 0 58%", background: "#0D1B2E", position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(24px, 4vh, 60px) 56px", overflow: "hidden", boxSizing: "border-box" }}>
        {/* Dot pattern */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(37,99,235,0.18) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
        {/* Glow violeta/azul */}
        <div style={{ position: "absolute", top: "-120px", left: "-80px", width: "480px", height: "480px", background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-100px", right: "-60px", width: "360px", height: "360px", background: "radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)", pointerEvents: "none" }} />
        {/* Contenido */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: "480px" }}>
          {/* Logo */}
          <div style={{ marginBottom: "clamp(20px, 3.5vh, 40px)" }}>
            <Logo size="1.7rem" barHeight={35} />
          </div>
          {/* Headline */}
          <h1 style={{ fontSize: "clamp(1.6rem, 3vh, 2.2rem)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", color: "#fff", marginBottom: "12px" }}>
            De información contable a{" "}
            <span style={{ background: "linear-gradient(90deg, #3B82F6, #7C3AED)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              claridad para decidir.
            </span>
          </h1>
          <p style={{ fontSize: "0.92rem", color: "#94A3B8", lineHeight: 1.6, marginBottom: "clamp(16px, 3vh, 32px)" }}>
            InsightsFlow transforma la información de su sistema contable en reportes, indicadores y análisis que ayudan a la gerencia a tener una visión más clara del desempeño de su empresa.
          </p>
          {/* Divider */}
          <div style={{ width: "48px", height: "2px", background: "linear-gradient(90deg, #2563EB, #7C3AED)", borderRadius: "2px", marginBottom: "clamp(16px, 2.5vh, 28px)" }} />
          {/* Bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 2vh, 20px)" }}>
            {bullets.map((b) => (
              <div key={b.title} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60A5FA", flexShrink: 0 }}>
                  {b.icon}
                </div>
                <div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#E2E8F0", marginBottom: "2px" }}>{b.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "#94A3B8", lineHeight: 1.55 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Badge empresa */}
          <div style={{ marginTop: "clamp(20px, 3.5vh, 36px)", display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "50px", padding: "6px 13px", fontSize: "0.7rem", color: "#60A5FA", fontWeight: 600, letterSpacing: "0.04em" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#60A5FA", display: "inline-block" }} />
            Para empresas que utilizan Siigo Nube o Alegra
          </div>
        </div>
      </div>

      {/* ── ENCABEZADO MÓVIL (solo visible en mobile) ── */}
      <div className="if-login-mobile-header" style={{ display: "none", background: "#0D1B2E", padding: "28px 24px 22px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(37,99,235,0.18) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Logo size="1.2rem" barHeight={24} />
          <p style={{ marginTop: "12px", marginBottom: 0, fontSize: "0.95rem", fontWeight: 700, color: "#fff", lineHeight: 1.35 }}>
            De información contable a{" "}
            <span style={{ background: "linear-gradient(90deg, #3B82F6, #7C3AED)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              claridad para decidir.
            </span>
          </p>
          <p className="if-login-mobile-tagline" style={{ marginTop: "6px", marginBottom: 0, fontSize: "0.78rem", color: "#94A3B8", lineHeight: 1.5 }}>
            Reportes, indicadores y análisis para una visión más clara de su empresa.
          </p>
        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className="if-login-right" style={{ flex: 1, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 32px", boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>
          {/* Logo + lema discretos arriba del form (desktop) */}
          <div className="if-login-right-brand" style={{ marginBottom: "22px" }}>
            <Logo size="1.15rem" barHeight={22} textColor="#0F172A" />
            <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "0.78rem", color: "#64748B", lineHeight: 1.4 }}>
              De información contable a claridad para decidir.
            </p>
          </div>
          {/* Encabezado form */}
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>Iniciar sesión</h2>
            <p style={{ fontSize: "0.875rem", color: "#64748B" }}>Ingresa tus credenciales para acceder al panel.</p>
          </div>
          {/* Error */}
          {error && (
            <div style={{ marginBottom: "16px", padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "0.85rem", color: "#DC2626" }} role="alert">
              {error}
            </div>
          )}
          <form ref={formRef} onSubmit={handleSubmit}>
            {/* Usuario */}
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="email" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Usuario</label>
              <input id="email" type="text" placeholder="Correo o usuario" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff", fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563EB")} onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")} />
            </div>
            {/* Contraseña */}
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="password" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Contraseña</label>
              <div style={{ position: "relative" }}>
                <input id="password" type={showPwd ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required
                  style={{ width: "100%", padding: "10px 44px 10px 14px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff", fontSize: "0.9rem", color: "#111827", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563EB")} onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")} />
                <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#9CA3AF" }}>
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
            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: loading ? "#93C5FD" : "#2563EB", color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s, transform 0.15s", fontFamily: "'Inter', sans-serif" }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = "#1D4ED8"); }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget.style.background = "#2563EB"); }}>
              {loading ? "Ingresando..." : "Iniciar sesión →"}
            </button>
          </form>
          {/* Footer form */}
          <p style={{ marginTop: "20px", fontSize: "0.72rem", color: "#9CA3AF", textAlign: "center" }}>
            © {new Date().getFullYear()} Impocommerce SAS · InsightsFlow
          </p>
        </div>
      </div>

      {/* Reset de margen del body + responsive */}
      <style jsx global>{`
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
      `}</style>
      <style jsx>{`
        .if-login-mobile-header { display: none; }
        @media (max-width: 768px) {
          .if-login-root {
            flex-direction: column !important;
            height: auto !important;
            max-height: none !important;
            overflow: auto !important;
          }
          .if-login-left { display: none !important; }
          .if-login-mobile-header { display: block !important; }
          .if-login-right {
            flex: 1 1 auto !important;
            padding: 24px !important;
            overflow: visible !important;
          }
          .if-login-right-brand { display: none !important; }
        }
        @media (max-width: 340px) {
          .if-login-mobile-tagline { display: none !important; }
        }
      `}</style>
    </div>
  );
}
