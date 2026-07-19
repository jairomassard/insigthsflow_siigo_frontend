"use client";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function usePermisos() {
  const [permisos, setPermisos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      // Reintentos con backoff corto: un solo fallo transitorio (ej. backend
      // recien reiniciado tras un deploy) no debe dejar el menu lateral
      // completamente vacio sin ninguna recuperacion - antes un solo error
      // silencioso aqui ocultaba todos los links de navegacion.
      const intentos = [0, 800, 1600];
      for (let i = 0; i < intentos.length; i++) {
        if (intentos[i] > 0) await sleep(intentos[i]);
        try {
          const data = await authFetch("/api/mis_permisos");
          if (!cancelado) setPermisos(data || []);
          break;
        } catch (e) {
          console.error(`Error cargando permisos (intento ${i + 1}/${intentos.length}):`, e);
        }
      }
      if (!cancelado) setLoading(false);
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  return { permisos, loading };
}
