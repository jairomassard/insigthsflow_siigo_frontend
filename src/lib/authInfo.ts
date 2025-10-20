// src/lib/authInfo.ts
export type ClienteLite = { id: number; nombre: string; logo_url?: string };
export type WhoAmI = {
  idusuario: number;
  idcliente: number | null;
  idperfil?: number | null;
  perfilid: number;
  email: string;
  cliente?: ClienteLite;
};

const API = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000";

export async function getWhoAmI(): Promise<WhoAmI | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;

  try {
    const res = await fetch(`${API}/auth/whoami`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as WhoAmI;
  } catch {
    return null;
  }
}
