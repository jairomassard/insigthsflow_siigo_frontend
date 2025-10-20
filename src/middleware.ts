import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Proteger todo /dashboard
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("token")?.value || ""; // si luego usas cookie
    // Para localStorage no se puede leer aquí; alternativa: ruta pública + verificación client-side
    // Simplificamos: deja pasar y cada página verifica en client-side (ver hooks abajo)
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/dashboard/:path*"],
};
