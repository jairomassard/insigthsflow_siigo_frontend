// src/lib/api.ts
export const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function handle401() {
  try {
    localStorage.removeItem("token");
  } catch {}
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

export async function authFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  const isFormData = init.body instanceof FormData;

  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const fullUrl = `${API}${path}`;
  //console.log("➡️ authFetch to:", fullUrl);
  //console.log("➡️ Headers:", [...headers.entries()]);
  //console.log("➡️ Method:", init.method || "GET");

  try {
    const res = await fetch(fullUrl, { ...init, headers });

    if (res.status === 401) {
      handle401();
      throw new Error("No autorizado");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (e) {
    console.error("❌ authFetch error:", e);
    throw e;
  }
}
