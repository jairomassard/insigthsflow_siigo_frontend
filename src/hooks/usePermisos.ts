"use client";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";

export function usePermisos() {
  const [permisos, setPermisos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch("/api/mis_permisos");
        setPermisos(data || []);
      } catch (e) {
        console.error("Error cargando permisos:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { permisos, loading };
}
