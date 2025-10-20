// src/hooks/useAuthGuard.ts (sustituye el actual)
"use client";
import { useEffect, useState } from "react";
import { getWhoAmI } from "@/lib/authInfo";
import { useRouter, usePathname } from "next/navigation";

export default function useAuthGuard() {
  const [ok, setOk] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const me = await getWhoAmI();
      if (!mounted) return;
      if (!me) {
        // No autenticado: si no estamos en /login, vamos a login
        if (!pathname.startsWith("/login")) router.replace("/login");
        setOk(false);
      } else {
        // Autenticado: si estamos en /login, manda a dashboard
        if (pathname.startsWith("/login")) router.replace("/dashboard");
        setOk(true);
      }
    })();
    return () => { mounted = false; };
  }, [router, pathname]);

  return ok;
}

