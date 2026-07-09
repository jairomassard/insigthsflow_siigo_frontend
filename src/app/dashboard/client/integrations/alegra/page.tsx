"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MessageBox({
  message,
  type = "info",
}: {
  message: string;
  type?: "info" | "success" | "error" | "warning";
}) {
  const styles = {
    info: "border-blue-100 bg-blue-50 text-blue-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    error: "border-red-100 bg-red-50 text-red-700",
    warning: "border-amber-100 bg-amber-50 text-amber-800",
  };

  return <div className={`rounded-xl border p-3 text-sm ${styles[type]}`}>{message}</div>;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

export default function AlegraIntegrationPage() {
  useAuthGuard();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({ email: "", token: "" });
  const [masks, setMasks] = useState<{
    email?: string | null;
    token_mask?: string | null;
    updated_at?: string | null;
    conectado?: boolean;
  }>({});

  const [syncMsg, setSyncMsg] = useState("");
  const [syncLog, setSyncLog] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      setOk("");

      const data = await authFetch("/config/alegra");

      setForm({ email: data.email || "", token: "" });
      setMasks({
        email: data.email,
        token_mask: data.token_mask,
        updated_at: data.updated_at,
        conectado: data.conectado,
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload: any = { email: form.email || null };
      if (form.token.trim()) payload.token = form.token.trim();

      await authFetch("/config/alegra", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setOk("Credenciales de Alegra guardadas correctamente.");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setErr("");
    setOk("");

    try {
      const data = await authFetch("/alegra/test_auth", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (data.ok) {
        setOk(`¡Conexión exitosa con Alegra! Usuario: ${data.usuario || data.email || ""}`);
      } else {
        setErr(data.error || "No fue posible autenticar contra Alegra.");
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setTesting(false);
    }
  };

  const runSyncAll = async () => {
    setSyncLoading(true);
    setSyncMsg("");
    setSyncLog("");
    setErr("");

    try {
      const data = await authFetch("/alegra/sync-all", {
        method: "POST",
        body: JSON.stringify({}),
      });

      setSyncMsg("Sincronización completada.");
      setSyncLog(data.detalle || "");
    } catch (e: any) {
      setSyncMsg("Error ejecutando la sincronización completa.");
      setErr(e.message);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">🔌 Integración Alegra</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Conecta la cuenta de Alegra de este cliente para sincronizar catálogos, movimientos
              contables, facturas, notas crédito, compras y pagos.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">Estado de conexión</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  masks.conectado
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {masks.conectado ? "Conectado" : "No conectado"}
              </span>
            </div>
          </div>
        </div>

        <hr className="border-slate-200" />
      </div>

      {err && <MessageBox message={err} type="error" />}
      {ok && <MessageBox message={ok} type="success" />}

      <Card
        title="1. Credenciales de conexión Alegra"
        subtitle="Ingresa el email y el token de API de la cuenta de Alegra. El token se guarda cifrado y solo se muestra enmascarado."
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando configuración…</p>
        ) : (
          <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email de Alegra</label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                placeholder="cuenta@empresa.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Token de API{" "}
                {masks.token_mask ? (
                  <span className="text-xs text-slate-500">(actual: {masks.token_mask})</span>
                ) : null}
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                type="password"
                placeholder="••••••••"
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
              />
            </div>

            <div className="lg:col-span-2">
              {masks.updated_at && (
                <div className="mb-3 text-xs text-slate-500">
                  Última actualización de credenciales: {formatDateTime(masks.updated_at)}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                    saving ? "bg-blue-400" : "bg-blue-700 hover:bg-blue-800"
                  }`}
                  disabled={saving || testing}
                >
                  {saving ? "Guardando…" : "Guardar credenciales"}
                </button>

                <button
                  type="button"
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  onClick={load}
                  disabled={saving || testing}
                >
                  Restablecer
                </button>

                <button
                  type="button"
                  className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                    testing ? "bg-emerald-400" : "bg-emerald-700 hover:bg-emerald-800"
                  }`}
                  onClick={testConnection}
                  disabled={saving || testing}
                >
                  {testing ? "Probando…" : "Probar conexión"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Card>

      <Card
        title="2. Sincronización completa"
        subtitle="Ejecuta en orden todos los procesos: catálogos, movimientos contables, facturas, notas crédito, compras y pagos. Puede tardar varios minutos."
        className="border-blue-200 bg-blue-50/40"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Sincronizar todo ahora</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Requiere que las credenciales ya estén guardadas y validadas.
            </p>
          </div>

          <button
            type="button"
            onClick={runSyncAll}
            disabled={syncLoading}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncLoading ? "Sincronizando…" : "🔁 Sincronizar todo ahora"}
          </button>
        </div>

        {syncMsg && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {syncMsg}
          </div>
        )}

        {syncLog && (
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
            {syncLog}
          </pre>
        )}
      </Card>
    </div>
  );
}
