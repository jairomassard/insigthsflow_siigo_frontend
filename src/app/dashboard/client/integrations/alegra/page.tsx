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

const formatDateTime = (value?: string | null, timezone = "America/Bogota") => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-CO", {
      timeZone: timezone,
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

  const [status, setStatus] = useState<any>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [syncActivoConfig, setSyncActivoConfig] = useState(true);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMsg, setHistoryMsg] = useState("");
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [historyTimezone, setHistoryTimezone] = useState("America/Bogota");

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

  const loadStatus = async () => {
    try {
      const data = await authFetch("/config/alegra-sync-status");
      setStatus(data);
      setSyncActivoConfig(!!data?.activo);
    } catch (e: any) {
      console.error("Error cargando estado de programación:", e);
    }
  };

  useEffect(() => {
    load();
    loadStatus();
  }, []);

  const saveSyncConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg("");
    setSavingConfig(true);

    try {
      const formTarget = e.target as any;
      const hora = formTarget.hora.value;
      const frecuencia = formTarget.frecuencia.value;

      await authFetch("/config/alegra-sync", {
        method: "POST",
        body: JSON.stringify({
          hora_ejecucion: hora,
          frecuencia_dias: Number(frecuencia),
          activo: syncActivoConfig,
        }),
      });

      setSaveMsg("✅ Programación guardada correctamente.");
      await loadStatus();
    } catch (e: any) {
      setSaveMsg("❌ Error al guardar la programación: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

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

  const loadSyncHistory = async () => {
    setHistoryLoading(true);
    setHistoryMsg("");

    try {
      const data = await authFetch("/config/alegra-sync-history?limit=50");

      setSyncHistory(data?.items || []);
      setHistoryTimezone(data?.timezone || "America/Bogota");

      if (!data?.items?.length) {
        setHistoryMsg("No hay sincronizaciones registradas todavía.");
      }
    } catch (e: any) {
      setHistoryMsg("Error consultando historial: " + e.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = async () => {
    setHistoryOpen(true);
    await loadSyncHistory();
  };

  const runSyncAll = async () => {
    setSyncLoading(true);
    setSyncMsg("");
    setSyncLog("");
    setErr("");

    try {
      await authFetch("/alegra/sync-all", {
        method: "POST",
        body: JSON.stringify({}),
      });

      setSyncMsg(
        "Sincronización iniciada en segundo plano. Puede tardar varios minutos - abre el historial y presiona \"Actualizar historial\" para ver el resultado final."
      );
    } catch (e: any) {
      if (e.message && e.message.includes("Ya hay una sincronización en curso")) {
        setSyncMsg("Ya hay una sincronización en curso para este cliente. Revisa el historial.");
      } else {
        setSyncMsg("Error iniciando la sincronización.");
        setErr(e.message);
      }
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Última ejecución
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {formatDateTime(status?.ultimo_ejec, status?.timezone)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Última automática
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {formatDateTime(status?.ultimo_auto_ejec, status?.timezone)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Hora automática
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {status?.hora_ejecucion || "No configurada"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Frecuencia
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            Cada {status?.frecuencia_dias || 1} día(s)
          </div>
        </div>
      </div>

      <Card
        title="2. Programación automática"
        subtitle="Define cuándo debe correr la sincronización automática. La ejecución manual no cambia esta programación."
      >
        <form className="space-y-4" onSubmit={saveSyncConfig}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Hora ejecución
              <input
                type="time"
                name="hora"
                defaultValue={status?.hora_ejecucion || "05:00"}
                className="mt-1 rounded-xl border border-slate-300 p-2 text-sm"
              />
            </label>

            <label className="flex flex-col text-sm font-medium text-slate-700">
              Frecuencia en días
              <input
                type="number"
                min={1}
                name="frecuencia"
                defaultValue={status?.frecuencia_dias || 1}
                className="mt-1 rounded-xl border border-slate-300 p-2 text-sm"
              />
            </label>

            <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="activo"
                checked={syncActivoConfig}
                onChange={(e) => setSyncActivoConfig(e.target.checked)}
              />
              Sincronización activa
            </label>
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {savingConfig ? "Guardando…" : "Guardar programación"}
          </button>

          {saveMsg && <div className="text-sm text-slate-700">{saveMsg}</div>}
        </form>
      </Card>

      <Card
        title="3. Sincronización completa"
        subtitle="Ejecuta en orden todos los procesos: catálogos, movimientos contables, facturas, notas crédito, compras, pagos y la actualización del auxiliar contable (P&L, Balance, Cruce IVA, Retenciones e Indicadores). Puede tardar varios minutos."
        className="border-blue-200 bg-blue-50/40"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Sincronizar todo ahora</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Requiere que las credenciales ya estén guardadas y validadas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openHistoryModal}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              📜 Ver historial
            </button>

            <button
              type="button"
              onClick={runSyncAll}
              disabled={syncLoading}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncLoading ? "Iniciando…" : "🔁 Sincronizar todo ahora"}
            </button>
          </div>
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

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Historial de sincronizaciones Alegra
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Revisa las últimas ejecuciones, su resultado y el detalle técnico paso a paso.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[calc(88vh-80px)] overflow-auto p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Zona horaria: <strong>{historyTimezone}</strong>
                </div>

                <button
                  type="button"
                  onClick={loadSyncHistory}
                  disabled={historyLoading}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  {historyLoading ? "Actualizando…" : "Actualizar historial"}
                </button>
              </div>

              {historyMsg && (
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                  {historyMsg}
                </div>
              )}

              {historyLoading && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Cargando historial…
                </div>
              )}

              {!historyLoading && syncHistory.length > 0 && (
                <div className="space-y-4">
                  {syncHistory.map((item) => {
                    const isRunning = item.resultado === "EN_EJECUCION";

                    const hasError =
                      !isRunning &&
                      (item.resultado === "ERROR" || Number(item.pasos_error || 0) > 0);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 ${
                          isRunning
                            ? "border-blue-200 bg-blue-50/70"
                            : hasError
                            ? "border-red-200 bg-red-50/70"
                            : "border-emerald-200 bg-emerald-50/70"
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  isRunning
                                    ? "bg-blue-100 text-blue-700"
                                    : hasError
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {isRunning ? "En ejecución" : hasError ? "Con error" : "Correcta"}
                              </span>

                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                {item.origen === "cron" ? "Automática" : "Manual"}
                              </span>
                            </div>

                            <div className="mt-2 text-sm font-semibold text-slate-950">
                              Iniciada: {formatDateTime(item.fecha_programada, historyTimezone)}
                            </div>

                            {!isRunning && (
                              <div className="text-sm text-slate-600">
                                Terminada: {formatDateTime(item.ejecutado_en, historyTimezone)}
                              </div>
                            )}

                            {isRunning && (
                              <div className="mt-2 text-sm text-blue-800">
                                Este proceso sigue ejecutándose en segundo plano. Presiona{" "}
                                <strong>Actualizar historial</strong> en unos minutos para ver el resultado final.
                              </div>
                            )}

                            {hasError && item.endpoint_fallido && (
                              <div className="mt-2 text-sm text-red-800">
                                Falló en: <strong>{item.endpoint_fallido}</strong>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="font-bold text-slate-900">{item.total_pasos || 0}</div>
                              <div className="text-slate-500">Pasos</div>
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="font-bold text-emerald-700">{item.pasos_ok || 0}</div>
                              <div className="text-slate-500">OK</div>
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="font-bold text-red-700">{item.pasos_error || 0}</div>
                              <div className="text-slate-500">Errores</div>
                            </div>
                          </div>
                        </div>

                        <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                            Ver detalle técnico
                          </summary>

                          <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                            {item.detalle || "Sin detalle técnico registrado."}
                          </pre>
                        </details>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
