"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientHome() {
  const router = useRouter();

  useEffect(() => {
    // Elige la primera pantalla del panel del cliente
    router.replace("/dashboard/client"); // o "/dashboard/client/profiles"
  }, [router]);

  return null;
}



