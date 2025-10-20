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
      // 1) Login
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

      // 2) Guardar token
      const token = data.access_token as string;
      localStorage.setItem("token", token);

      // 3) Redirigir y que /dashboard decida el panel
      router.replace("/dashboard");
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // Si ya hay token, intenta mandar directo a /dashboard
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) router.replace("/dashboard");
  }, [router]);

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage:
          "url('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMWKFsqkdayIKlT4wkegdYhko5JoQJuIMwaw1rrLE2rKU-FflFzU74IE5yOObgTPfHjfRl-qUK3Lx10R0dczZmZA0zLjsHftkAylBSWX_RT_D1azgDv5aVauT-gp_xi8U62xwwHwwV7mlexbEv8NNuNrfBrRQBg88s98Gh4bzwxapQA77u2646gRwoTnY/s16000/seccion-media-de-un-hombre-de-negocios-analizando-graficos-en-su-escritorio.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay para legibilidad */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm"
          aria-labelledby="login-title"
        >
          {/* Logo + título */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-2 flex h-12 items-center justify-center">
              <span className="text-4xl font-extrabold tracking-wide">
                
                <span className="text-blue-400">InsightsFlow</span>
              </span>
            </div>
            <h1 id="login-title" className="text-lg font-semibold text-gray-800">
              Inicio de sesión
            </h1>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          {/* Usuario */}
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Usuario
          </label>
          <input
            id="email"
            type="text"
            placeholder="Correo o usuario"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-emerald-400/30 focus:border-blue-500 focus:ring"
            autoComplete="username"
            required
            aria-invalid={!!error}
          />

          {/* Contraseña */}
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 outline-none ring-emerald-400/30 focus:border-blue-500 focus:ring"
              autoComplete="current-password"
              required
              aria-invalid={!!error}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-gray-100"
            >
              {showPwd ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" d="M3 3l18 18M10.58 10.58A3 3 0 0113.42 13.4M9.88 4.24A9.76 9.76 0 0112 4c6 0 10 8 10 8a15.7 15.7 0 01-4.06 5.18M6.1 6.1A15.77 15.77 0 002 12s4 8 10 8a9.82 9.82 0 003.2-.52" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" strokeWidth="2" />
                </svg>
              )}
            </button>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className={`mt-6 w-full rounded-lg px-4 py-2.5 font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-blue-400
              ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"}`}
          >
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>

          <div className="mt-4 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} Impocommerce SAS.
          </div>
        </form>
      </div>
    </div>
  );
}

