// frontend/src/lib/auth.ts
import { jwtDecode } from "jwt-decode"; // ✅ Correcto

interface TokenClaims {
  idusuario: number;
  email: string;
  perfilid: number;
  idcliente: number | null;
}

export function getUserClaims(): TokenClaims | null {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    return jwtDecode<TokenClaims>(token);
  } catch {
    return null;
  }
}
