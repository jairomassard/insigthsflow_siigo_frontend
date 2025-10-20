"use client";

import { authFetch } from "@/lib/api";

export default function LogoutButton() {
  const onLogout = async () => {
    try {
      await authFetch("/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  return (
    <button
      onClick={onLogout}
      className="w-full text-center flex items-center justify-center gap-2 rounded-md bg-white text-black px-3 py-2 text-sm font-medium hover:bg-gray-400 transition-colors"
    >
      Salir
    </button>
  );
}
