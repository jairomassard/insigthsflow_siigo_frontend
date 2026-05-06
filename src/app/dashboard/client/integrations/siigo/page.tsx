"use client";

import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch, getToken, API } from "@/lib/api";
import { jwtDecode } from "jwt-decode";

import CargarDocumentosSoporte from "../../../../../components/CargarDocumentosSoporte";
import CargarNomina from "../../../../../components/CargarNomina";

const fetchWithIdCliente = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const decoded: any = jwtDecode(token || "");
  const idcliente = decoded?.idcliente;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-ID-CLIENTE": String(idcliente),
    ...(options.headers || {}),
  };

  return fetch(`${API}${url}`, { ...options, headers });
};

const parseAuthData = async (resOrData: any) => {
  if (resOrData && typeof resOrData.json === "function") {
    return await resOrData.json();
  }
  return resOrData;
};

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

const getSyncSummaryFromLog = (fullLog: string) => {
  const lines: string[] = fullLog
    .split("\n")
    .filter((line: string) => line.trim().length > 0);

  const statusCodes = lines
    .map((line: string) => {
      const match = line.match(/->\s+(\d{3})/);
      return match ? Number(match[1]) : null;
    })
    .filter((code: number | null): code is number => code !== null);

  const totalPasos = statusCodes.length;
  const exitos = statusCodes.filter((code: number) => code >= 200 && code < 400).length;
  const errores = statusCodes.filter((code: number) => code >= 400).length;

  return {
    totalPasos,
    exitos,
    errores,
    resumen: `📊 Sincronización completada: ${totalPasos} pasos ejecutados -> ✅ ${exitos} correctos, ❌ ${errores} con error.`,
  };
};

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

function StatusPill({ value }: { value?: string | null }) {
  const ok = value === "OK";
  const error = value === "ERROR";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        ok
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : error
          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
          : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {value || "Sin estado"}
    </span>
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

function JsonBlock({ title, data }: { title?: string; data: any }) {
  return (
    <div className="mt-4">
      {title && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </div>
      )}
      <pre className="max-h-[460px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function ActionRow({
  title,
  description,
  buttonLabel,
  loadingLabel = "Procesando…",
  disabled,
  loading,
  onClick,
  tone = "slate",
}: {
  title: string;
  description?: string;
  buttonLabel: string;
  loadingLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  tone?: "slate" | "blue" | "emerald" | "amber" | "rose" | "sky";
}) {
  const tones = {
    slate: "bg-slate-800 hover:bg-slate-900",
    blue: "bg-blue-700 hover:bg-blue-800",
    emerald: "bg-emerald-700 hover:bg-emerald-800",
    amber: "bg-amber-700 hover:bg-amber-800",
    rose: "bg-rose-700 hover:bg-rose-800",
    sky: "bg-sky-700 hover:bg-sky-800",
  };

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm font-medium text-slate-900">{title}</div>
        {description && <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
      >
        {loading ? loadingLabel : buttonLabel}
      </button>
    </div>
  );
}

function DebugFacturaPanel() {
  const [name, setName] = useState("");
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    setOut(null);

    try {
      const qs = name
        ? `?name=${encodeURIComponent(name)}`
        : uuid
        ? `?uuid=${encodeURIComponent(uuid)}`
        : "";

      if (!qs) {
        setErr("Ingresa name FV o UUID.");
        return;
      }

      const res = await fetchWithIdCliente(`/siigo/debug-invoice${qs}`);
      const data = await res.json();

      if (res.ok) setOut(data);
      else setErr(data?.error || "Error inesperado");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">
        Consulta una factura por <strong>name</strong> o por <strong>UUID</strong>.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value) setUuid("");
          }}
          placeholder="FV-2-1674"
        />
        <input
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={uuid}
          onChange={(e) => {
            setUuid(e.target.value);
            if (e.target.value) setName("");
          }}
          placeholder="UUID de Siigo"
        />
      </div>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {loading ? "Consultando…" : "Consultar factura"}
      </button>

      {err && <MessageBox message={err} type="error" />}
      {out && <JsonBlock title="Resultado factura" data={out} />}
    </div>
  );
}

function DebugNotaCreditoPanel() {
  const [name, setName] = useState("");
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    setOut(null);

    try {
      const qs = name
        ? `?name=${encodeURIComponent(name)}`
        : uuid
        ? `?uuid=${encodeURIComponent(uuid)}`
        : "";

      if (!qs) {
        setErr("Ingresa name NC o UUID.");
        return;
      }

      const res = await fetchWithIdCliente(`/siigo/debug-nota-credito${qs}`);
      const data = await res.json();

      if (res.ok) setOut(data);
      else setErr(data?.error || "Error inesperado");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">
        Consulta una nota crédito por <strong>name</strong> o por <strong>UUID</strong>.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value) setUuid("");
          }}
          placeholder="NC-1234"
        />
        <input
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={uuid}
          onChange={(e) => {
            setUuid(e.target.value);
            if (e.target.value) setName("");
          }}
          placeholder="UUID de Siigo"
        />
      </div>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {loading ? "Consultando…" : "Consultar nota crédito"}
      </button>

      {err && <MessageBox message={err} type="error" />}
      {out && <JsonBlock title="Resultado nota crédito" data={out} />}
    </div>
  );
}

function DebugCompraPanel() {
  const [idcompra, setIdcompra] = useState("");
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");

  const run = async () => {
    setLoading(true);
    setErr("");
    setOut(null);

    try {
      const qs = idcompra
        ? `?idcompra=${encodeURIComponent(idcompra)}`
        : uuid
        ? `?uuid=${encodeURIComponent(uuid)}`
        : "";

      if (!qs) {
        setErr("Ingresa idcompra o UUID.");
        return;
      }

      const res = await fetchWithIdCliente(`/siigo/debug-compra${qs}`);
      const data = await res.json();

      if (res.ok) setOut(data);
      else setErr(data?.error || "Error inesperado");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">
        Consulta una compra por <strong>idcompra</strong> o por <strong>UUID</strong>.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={idcompra}
          onChange={(e) => {
            setIdcompra(e.target.value);
            if (e.target.value) setUuid("");
          }}
          placeholder="DS-1-1933"
        />
        <input
          className="w-full rounded-xl border border-slate-300 p-2 text-sm"
          value={uuid}
          onChange={(e) => {
            setUuid(e.target.value);
            if (e.target.value) setIdcompra("");
          }}
          placeholder="UUID de Siigo"
        />
      </div>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {loading ? "Consultando…" : "Consultar compra"}
      </button>

      {err && <MessageBox message={err} type="error" />}
      {out && <JsonBlock title="Resultado compra" data={out} />}
    </div>
  );
}

export default function SiigoIntegrationPage() {
  useAuthGuard();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [status, setStatus] = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const [mainSyncLoading, setMainSyncLoading] = useState(false);
  const [mainSyncMsg, setMainSyncMsg] = useState("");
  const [mainSyncLog, setMainSyncLog] = useState("");

  const [actionLoading, setActionLoading] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const [debugDsLoading, setDebugDsLoading] = useState(false);
  const [debugDsMsg, setDebugDsMsg] = useState("");
  const [debugDsJson, setDebugDsJson] = useState<any>(null);
  const [debugDsId, setDebugDsId] = useState("");

  const [syncDsStagingLoading, setSyncDsStagingLoading] = useState(false);
  const [syncDsStagingMsg, setSyncDsStagingMsg] = useState("");
  const [syncDsStagingJson, setSyncDsStagingJson] = useState<any>(null);
  const [syncDsBatch, setSyncDsBatch] = useState("50");
  const [syncDsMaxPages, setSyncDsMaxPages] = useState("");

  const [insertDsLoading, setInsertDsLoading] = useState(false);
  const [insertDsMsg, setInsertDsMsg] = useState("");
  const [insertDsJson, setInsertDsJson] = useState<any>(null);
  const [insertDsFechaDesde, setInsertDsFechaDesde] = useState("");
  const [syncFechaDesdeConfig, setSyncFechaDesdeConfig] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMsg, setHistoryMsg] = useState("");
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [historyTimezone, setHistoryTimezone] = useState("America/Bogota");

  
  const [form, setForm] = useState({
    base_url: "",
    client_id: "",
    client_secret: "",
    username: "",
    password: "",
    partner_id: "",
  });

  const [masks, setMasks] = useState<{
    client_secret_mask?: string | null;
    password_mask?: string | null;
    updated_at?: string | null;
  }>({});

  const timezone = status?.timezone || "America/Bogota";

  const estadoGeneral = useMemo(() => {
    if (!status) return "Sin información";
    if (status.resultado === "OK") return "Operativa";
    if (status.resultado === "ERROR") return "Con errores";
    return "Pendiente";
  }, [status]);

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      setOk("");

      const data = await authFetch("/config/siigo");

      setForm({
        base_url: data.base_url || "",
        client_id: data.client_id || "",
        client_secret: "",
        username: data.username || "",
        password: "",
        partner_id: data.partner_id || "",
      });

      setMasks({
        client_secret_mask: data.client_secret_mask,
        password_mask: data.password_mask,
        updated_at: data.updated_at,
      });

      const fechaGlobal = data?.sync_fecha_desde || data?.ds_fecha_desde || "";
      setSyncFechaDesdeConfig(fechaGlobal);
      setInsertDsFechaDesde(fechaGlobal);

    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const raw = await authFetch("/config/siigo-sync-status");
      const data = await parseAuthData(raw);

      setStatus(data);

      const fechaGlobal = data?.sync_fecha_desde || data?.ds_fecha_desde || "";
      setSyncFechaDesdeConfig(fechaGlobal);
      setInsertDsFechaDesde(fechaGlobal);

    } catch (e) {
      console.error("Error consultando estado de sincronización:", e);
    }
  };

  useEffect(() => {
    load();
    loadStatus();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload: any = {
        base_url: form.base_url || null,
        client_id: form.client_id || null,
        username: form.username || null,
        sync_fecha_desde: syncFechaDesdeConfig || null,
        ds_fecha_desde: syncFechaDesdeConfig || null,
      };

      if (form.client_secret.trim()) payload.client_secret = form.client_secret.trim();
      if (form.password.trim()) payload.password = form.password.trim();
      if (form.partner_id.trim()) payload.partner_id = form.partner_id.trim();

      await authFetch("/config/siigo", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setOk("Credenciales guardadas correctamente.");
      await load();
      await loadStatus();
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
      const res = await authFetch("/siigo/test_auth", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (res.ok) {
        setOk("¡Conexión exitosa con Siigo! Token válido.");
      } else {
        setErr(typeof res.error === "string" ? res.error : "No fue posible autenticar contra Siigo.");
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setTesting(false);
    }
  };

  const postEndpoint = async (
    endpoint: string,
    label: string,
    successFallback = "Proceso finalizado correctamente."
  ) => {
    setActionLoading(endpoint);
    setActionMsg("");

    try {
      const endpointFinal = endpointConFechaGlobal(endpoint);

      const res = await fetchWithIdCliente(endpointFinal, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.detalle || `HTTP ${res.status}`);
      }

      if (data?.estado === "EN_EJECUCION" || data?.log_id) {
        setActionMsg(
          `${label}: ${data?.mensaje || "Proceso iniciado en segundo plano."} Revisa el historial para ver el resultado final.`
        );
      } else {
        setActionMsg(`${label}: ${data?.mensaje || successFallback}`);
      }
      await loadStatus();
    } catch (e: any) {
      setActionMsg(`${label}: Error - ${e.message}`);
    } finally {
      setActionLoading("");
    }
  };

  const runSyncAll = async () => {
    setMainSyncLoading(true);
    setMainSyncMsg("");
    setMainSyncLog("");

    try {
      const token = getToken();
      const decoded: any = jwtDecode(token || "");
      const idcliente = decoded?.idcliente;

      const res = await fetch(`${API}/siigo/sync-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-ID-CLIENTE": String(idcliente),
        },
        body: JSON.stringify({
          origen: "manual",
          sync_fecha_desde: syncFechaDesdeConfig || null,
          ds_fecha_desde: syncFechaDesdeConfig || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.detalle || "Falló la sincronización.");
      }

      const fullLog = data.detalle || "";
      const { resumen, errores } = getSyncSummaryFromLog(fullLog);

      setMainSyncMsg(resumen);
      setMainSyncLog(fullLog);

      if (errores > 0) {
        setErr("La sincronización terminó con errores. Revisa el detalle técnico.");
      } else {
        setErr("");
      }

      await loadStatus();
    } catch (e: any) {
      setMainSyncMsg("Error ejecutando sincronización completa: " + e.message);
    } finally {
      setMainSyncLoading(false);
    }
  };

  const saveSyncConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMsg("");
    setSavingConfig(true);

    try {
      const formTarget = e.target as any;
      const hora = formTarget.hora.value;
      const frecuencia = formTarget.frecuencia.value;
      const activo = formTarget.activo.checked;

      await authFetch("/config/sync", {
        method: "POST",
        body: JSON.stringify({
          hora_ejecucion: hora,
          frecuencia_dias: Number(frecuencia),
          activo,
          sync_fecha_desde: syncFechaDesdeConfig || null,
          ds_fecha_desde: syncFechaDesdeConfig || null,
        }),
      });

      setSaveMsg("✅ Configuración guardada correctamente.");
      await loadStatus();
    } catch (e: any) {
      setSaveMsg("❌ Error al guardar configuración: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const consultarTiposDocumentoDS = async () => {
    setDebugDsLoading(true);
    setDebugDsMsg("");
    setDebugDsJson(null);

    try {
      const res = await fetchWithIdCliente("/siigo/debug-document-types-ds", {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setDebugDsMsg("Tipos de documento soporte consultados correctamente.");
      setDebugDsJson(data);
    } catch (error: any) {
      setDebugDsMsg(`Error consultando tipos DS: ${error.message}`);
    } finally {
      setDebugDsLoading(false);
    }
  };

  const consultarDocumentosSoporte = async () => {
    setDebugDsLoading(true);
    setDebugDsMsg("");
    setDebugDsJson(null);

    try {
      const res = await fetchWithIdCliente("/siigo/debug-documentos-soporte?page_size=5&page=1", {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setDebugDsMsg("Documentos soporte consultados correctamente. No se guardó información.");
      setDebugDsJson(data);
    } catch (error: any) {
      setDebugDsMsg(`Error consultando documentos soporte: ${error.message}`);
    } finally {
      setDebugDsLoading(false);
    }
  };

  const consultarDocumentoSoportePorId = async () => {
    if (!debugDsId.trim()) {
      setDebugDsMsg("Primero escribe el ID del documento soporte.");
      return;
    }

    setDebugDsLoading(true);
    setDebugDsMsg("");
    setDebugDsJson(null);

    try {
      const res = await fetchWithIdCliente(
        `/siigo/debug-documentos-soporte/${encodeURIComponent(debugDsId.trim())}`,
        { method: "GET" }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setDebugDsMsg("Detalle de documento soporte consultado correctamente.");
      setDebugDsJson(data);
    } catch (error: any) {
      setDebugDsMsg(`Error consultando detalle DS: ${error.message}`);
    } finally {
      setDebugDsLoading(false);
    }
  };

  const sincronizarDocumentosSoporteStaging = async () => {
    setSyncDsStagingLoading(true);
    setSyncDsStagingMsg("");
    setSyncDsStagingJson(null);

    try {
      const batch = syncDsBatch.trim() || "50";
      const maxPages = syncDsMaxPages.trim();

      const query = new URLSearchParams();
      query.set("batch", batch);

      if (maxPages) {
        query.set("max_pages", maxPages);
      }

      const res = await fetchWithIdCliente(`/siigo/sync-documentos-soporte-staging?${query.toString()}`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.detalle || `HTTP ${res.status}`);
      }

      setSyncDsStagingMsg(
        `Actualización staging finalizada. Nuevas: ${data?.nuevas ?? 0}, actualizadas: ${
          data?.actualizadas ?? 0
        }, errores: ${data?.errores ?? 0}, omitidas: ${data?.omitidas ?? 0}.`
      );

      setSyncDsStagingJson(data);
    } catch (error: any) {
      setSyncDsStagingMsg(`Error actualizando staging DS: ${error.message}`);
    } finally {
      setSyncDsStagingLoading(false);
    }
  };

  const insertarDocumentosSoporteDesdeStaging = async (dryRun = true) => {
    setInsertDsLoading(true);
    setInsertDsMsg("");
    setInsertDsJson(null);

    try {
      const fechaDesde = insertDsFechaDesde.trim();

      const query = new URLSearchParams();
      query.set("dry_run", dryRun ? "1" : "0");

      if (fechaDesde) {
        query.set("fecha_desde", fechaDesde);
      }

      const res = await fetchWithIdCliente(
        `/siigo/insert-documentos-soporte-desde-staging?${query.toString()}`,
        {
          method: "POST",
          body: JSON.stringify({
            fecha_desde: fechaDesde || null,
            dry_run: dryRun,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.detalle || `HTTP ${res.status}`);
      }

      if (dryRun) {
        setInsertDsMsg(
          `Simulación finalizada. Candidatos encontrados: ${
            data?.candidatos ?? 0
          }. No se insertó información.`
        );
      } else {
        setInsertDsMsg(
          `Inserción finalizada. Insertadas: ${data?.insertadas ?? 0}, ítems insertados: ${
            data?.items_insertados ?? 0
          }, omitidas: ${data?.omitidas ?? 0}, errores: ${data?.errores ?? 0}.`
        );
      }

      setInsertDsJson(data);
      await loadStatus();
    } catch (error: any) {
      setInsertDsMsg(`Error procesando DS desde staging: ${error.message}`);
    } finally {
      setInsertDsLoading(false);
    }
  };


  const loadSyncHistory = async () => {
    setHistoryLoading(true);
    setHistoryMsg("");

    try {
      const data = await authFetch("/config/siigo-sync-history?limit=10");

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

  const endpointConFechaGlobal = (endpoint: string) => {
    const fecha = syncFechaDesdeConfig.trim();

    if (!fecha) return endpoint;

    const aplica =
      endpoint.startsWith("/siigo/sync-facturas") ||
      endpoint.startsWith("/siigo/sync-notas-credito") ||
      endpoint.startsWith("/siigo/sync-compras");

    if (!aplica) return endpoint;

    const [path, queryString = ""] = endpoint.split("?");
    const params = new URLSearchParams(queryString);

    if (!params.get("since")) {
      params.set("since", fecha);
    }

    return `${path}?${params.toString()}`;
  };


  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">🔌 Integración Siigo</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Configura la conexión con Siigo, ejecuta sincronizaciones manuales y controla la
              automatización de datos que alimenta los reportes de InsightFlow.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">Estado general</div>
            <div className="mt-1 flex items-center gap-2">
              <StatusPill value={status?.resultado} />
              <span className="text-sm font-semibold text-slate-800">{estadoGeneral}</span>
            </div>
          </div>
        </div>

        <hr className="border-slate-200" />
      </div>

      {err && <MessageBox message={err} type="error" />}
      {ok && <MessageBox message={ok} type="success" />}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Última ejecución
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {formatDateTime(status?.ultimo_ejec, timezone)}
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Fecha inicial de datos Siigo
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900">
            {syncFechaDesdeConfig || "Sin límite"}
          </div>
        </div>
      </div>

      <Card
        title="1. Credenciales de conexión Siigo"
        subtitle="Registra las credenciales API entregadas por Siigo. La contraseña y el client secret se guardan cifrados y solo se muestran enmascarados."
      >
        {loading ? (
          <p className="text-sm text-slate-500">Cargando configuración…</p>
        ) : (
          <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Base URL</label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                placeholder="https://api.siigo.com/"
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">
                Normalmente: https://api.siigo.com/
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Partner ID</label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                placeholder="Ej: nombreempresa"
                value={form.partner_id}
                onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">
                Solicítalo a Siigo o usa el identificador indicado por ellos.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client ID</label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Client Secret{" "}
                {masks.client_secret_mask ? (
                  <span className="text-xs text-slate-500">(actual: {masks.client_secret_mask})</span>
                ) : null}
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                type="password"
                placeholder="••••••••"
                value={form.client_secret}
                onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password{" "}
                {masks.password_mask ? (
                  <span className="text-xs text-slate-500">(actual: {masks.password_mask})</span>
                ) : null}
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="lg:col-span-2">
              {masks.updated_at && (
                <div className="mb-3 text-xs text-slate-500">
                  Última actualización de credenciales: {formatDateTime(masks.updated_at, timezone)}
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
        title="2. Programación automática"
        subtitle="Define cuándo debe correr la sincronización automática. La ejecución manual no cambia esta programación."
      >
        <form className="space-y-4" onSubmit={saveSyncConfig}>
          <div className="grid gap-4 md:grid-cols-4">
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

            <label className="flex flex-col text-sm font-medium text-slate-700">
              Fecha inicial de datos Siigo
              <input
                type="date"
                value={syncFechaDesdeConfig}
                onChange={(e) => {
                  setSyncFechaDesdeConfig(e.target.value);
                  setInsertDsFechaDesde(e.target.value);
                }}
                className="mt-1 rounded-xl border border-slate-300 p-2 text-sm"
              />
            </label>

            <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
              <input type="checkbox" name="activo" defaultChecked={status?.activo !== false} />
              Sincronización activa
            </label>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
            <strong>Fecha inicial de datos Siigo:</strong> define desde qué fecha InsightFlow
            sincronizará documentos transaccionales de Siigo: facturas de venta, notas crédito,
            compras y documentos soporte. Si se deja vacío, el sistema no limita por fecha y usará
            todo lo disponible en Siigo.
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
        subtitle="Ejecuta en orden todos los procesos principales: catálogos, terceros, productos, facturas, notas crédito, compras, documentos soporte API, cuentas por pagar y cruce."
        className="border-blue-200 bg-blue-50/40"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Sincronizar todo ahora</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Esta acción no modifica la hora programada automática. Puede tardar varios minutos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={runSyncAll}
              disabled={mainSyncLoading}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mainSyncLoading ? "Sincronizando…" : "🔁 Sincronizar todo ahora"}
            </button>

            <button
              type="button"
              onClick={openHistoryModal}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              📜 Ver historial
            </button>
          </div>
        </div>

        {mainSyncMsg && (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${
              mainSyncMsg.includes("❌ 0")
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-amber-100 bg-amber-50 text-amber-900"
            }`}
          >
            {mainSyncMsg}
          </div>
        )}

        {mainSyncLog && (
          <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
            <summary className="cursor-pointer font-semibold">Ver log técnico de la ejecución</summary>
            <pre className="mt-3 max-h-[520px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
              {mainSyncLog}
            </pre>
          </details>
        )}
      </Card>

      <Card
        title="4. Carga inicial y sincronización manual por módulos"
        subtitle="Usa estas acciones cuando necesites cargar o actualizar módulos específicos sin ejecutar todo el proceso completo."
      >
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Historial de sincronizaciones manuales
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Revisa si una sincronización manual sigue en ejecución, terminó correctamente o falló.
              Aplica especialmente para procesos en background como facturas, detalle de facturas y compras.
            </p>
          </div>

          <button
            type="button"
            onClick={openHistoryModal}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            📜 Ver historial manual
          </button>
        </div>

        <ActionRow
          title="Catálogos"
          description="Sincroniza vendedores, centros de costo y catálogos base."
          buttonLabel="Sincronizar catálogos"
          loading={actionLoading === "/siigo/sync-catalogos"}
          disabled={!!actionLoading}
          tone="amber"
          onClick={() => postEndpoint("/siigo/sync-catalogos", "Catálogos")}
        />

        <ActionRow
          title="Clientes"
          description="Actualiza terceros/clientes registrados en Siigo."
          buttonLabel="Sincronizar clientes"
          loading={actionLoading === "/siigo/sync-customers"}
          disabled={!!actionLoading}
          tone="emerald"
          onClick={() => postEndpoint("/siigo/sync-customers", "Clientes")}
        />

        <ActionRow
          title="Proveedores"
          description="Actualiza proveedores registrados en Siigo."
          buttonLabel="Sincronizar proveedores"
          loading={actionLoading === "/siigo/sync-proveedores"}
          disabled={!!actionLoading}
          tone="sky"
          onClick={() => postEndpoint("/siigo/sync-proveedores", "Proveedores")}
        />

        <ActionRow
          title="Productos"
          description="Actualiza productos y servicios disponibles en Siigo."
          buttonLabel="Sincronizar productos"
          loading={actionLoading === "/siigo/sync-productos"}
          disabled={!!actionLoading}
          tone="emerald"
          onClick={() => postEndpoint("/siigo/sync-productos", "Productos")}
        />

        <ActionRow
          title="Facturas de venta - modo ligero"
          description="Trae facturas principales y datos generales."
          buttonLabel="Sincronizar facturas"
          loading={actionLoading === "/siigo/sync-facturas"}
          disabled={!!actionLoading}
          tone="blue"
          onClick={() => postEndpoint("/siigo/sync-facturas", "Facturas")}
        />

        <ActionRow
          title="Facturas de venta - detalle"
          description="Completa información detallada de facturas, impuestos, pagos y totales por lotes."
          buttonLabel="Sincronizar detalle"
          loading={actionLoading === "/siigo/sync-facturas?deep=1&batch=100&only_missing=1"}
          disabled={!!actionLoading}
          tone="blue"
          onClick={() =>
            postEndpoint(
              "/siigo/sync-facturas?deep=1&batch=100&only_missing=1",
              "Facturas detalladas"
            )
          }
        />

        <ActionRow
          title="Notas crédito"
          description="Actualiza notas crédito asociadas a facturación."
          buttonLabel="Sincronizar notas crédito"
          loading={actionLoading === "/siigo/sync-notas-credito"}
          disabled={!!actionLoading}
          tone="rose"
          onClick={() => postEndpoint("/siigo/sync-notas-credito", "Notas crédito")}
        />

        <ActionRow
          title="Compras"
          description="Actualiza compras y documentos de egreso desde Siigo."
          buttonLabel="Sincronizar compras"
          loading={actionLoading === "/siigo/sync-compras"}
          disabled={!!actionLoading}
          tone="blue"
          onClick={() => postEndpoint("/siigo/sync-compras", "Compras")}
        />

        <ActionRow
          title="Cuentas por pagar"
          description="Trae saldos de cuentas por pagar desde Siigo."
          buttonLabel="Sincronizar cuentas por pagar"
          loading={actionLoading === "/siigo/sync-accounts-payable"}
          disabled={!!actionLoading}
          tone="blue"
          onClick={() => postEndpoint("/siigo/sync-accounts-payable", "Cuentas por pagar")}
        />

        <ActionRow
          title="Cruce de cuentas por pagar"
          description="Cruza saldos de Siigo contra compras locales para actualizar estados y saldos."
          buttonLabel="Cruzar cuentas por pagar"
          loading={actionLoading === "/siigo/cross-accounts-payable"}
          disabled={!!actionLoading}
          tone="emerald"
          onClick={() => postEndpoint("/siigo/cross-accounts-payable", "Cruce cuentas por pagar")}
        />

        {actionMsg && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 md:flex-row md:items-center md:justify-between">
            <div>{actionMsg}</div>

            <button
              type="button"
              onClick={openHistoryModal}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
            >
              Ver historial
            </button>
          </div>
        )}
      </Card>

      <Card
        title="5. Documento Soporte API"
        subtitle="Flujo estándar para documentos soporte: primero se actualiza staging y luego se insertan en compras únicamente los documentos nuevos, aceptados, con valor y con ítems."
      >
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <h3 className="text-sm font-semibold text-emerald-950">
            Actualizar staging de Documentos Soporte
          </h3>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            Este proceso consulta Documento Soporte desde Siigo API y actualiza una tabla temporal.
            No afecta reportes por sí solo.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[160px_160px_auto]">
            <div>
              <label className="mb-1 block text-xs font-medium text-emerald-900">
                Batch
              </label>
              <input
                value={syncDsBatch}
                onChange={(e) => setSyncDsBatch(e.target.value)}
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-emerald-900">
                Máx. páginas
              </label>
              <input
                value={syncDsMaxPages}
                onChange={(e) => setSyncDsMaxPages(e.target.value)}
                placeholder="Vacío = sin límite"
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={sincronizarDocumentosSoporteStaging}
                disabled={syncDsStagingLoading}
                className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 md:w-auto"
              >
                {syncDsStagingLoading ? "Actualizando…" : "Actualizar staging"}
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-emerald-800">
            Para operación normal se recomienda batch 50 y dejar Máx. páginas vacío.
          </p>

          {syncDsStagingMsg && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
              {syncDsStagingMsg}
            </div>
          )}

          {syncDsStagingJson && <JsonBlock title="Resultado staging" data={syncDsStagingJson} />}
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-950">
            Insertar Documentos Soporte nuevos en compras
          </h3>
          <p className="mt-1 text-sm leading-6 text-blue-800">
            Inserta en compras solo los documentos nuevos que cumplan las reglas de seguridad. El
            saldo y estado final se ajustan después con cuentas por pagar y cruce.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[190px_auto_auto]">
            <div>
              <label className="mb-1 block text-xs font-medium text-blue-900">Fecha desde</label>
              <input
                type="date"
                value={insertDsFechaDesde}
                onChange={(e) => setInsertDsFechaDesde(e.target.value)}
                className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-blue-700">
                Si queda vacío, no se limita por fecha.
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => insertarDocumentosSoporteDesdeStaging(true)}
                disabled={insertDsLoading}
                className="w-full rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50 md:w-auto"
              >
                {insertDsLoading ? "Procesando…" : "Simular inserción"}
              </button>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => insertarDocumentosSoporteDesdeStaging(false)}
                disabled={insertDsLoading}
                className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 md:w-auto"
              >
                {insertDsLoading ? "Insertando…" : "Insertar DS nuevos"}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-900">
            <strong>Reglas aplicadas:</strong> solo nuevos, solo Accepted, total mayor a cero,
            con ítems y fecha mayor o igual a la fecha seleccionada.
          </div>

          {insertDsMsg && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-900">
              {insertDsMsg}
            </div>
          )}

          {insertDsJson && <JsonBlock title="Resultado inserción DS" data={insertDsJson} />}
        </div>
      </Card>

      <Card
        title="6. Archivos complementarios"
        subtitle="Cargues que todavía dependen de archivos externos. Documento Soporte por Excel se conserva solo como contingencia."
      >
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Cargar nómina desde Excel
          </summary>
          <div className="mt-3">
            <p className="mb-3 text-sm leading-6 text-slate-600">
              Exporta el reporte mensual de nómina desde Siigo y súbelo indicando mes y año.
            </p>
            <CargarNomina />
          </div>
        </details>

        <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-amber-950">
            Contingencia: cargar Documento Soporte desde Excel
          </summary>
          <div className="mt-3">
            <p className="mb-3 text-sm leading-6 text-amber-900">
              Este cargue queda disponible solo como respaldo operativo. El flujo estándar ahora es
              Documento Soporte API.
            </p>
            <CargarDocumentosSoporte />
          </div>
        </details>
      </Card>

      <Card
        title="7. Herramientas avanzadas de diagnóstico"
        subtitle="Sección para soporte técnico. Úsala solo cuando necesites comparar respuestas de Siigo contra la información almacenada en InsightFlow."
      >
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Exploración Documento Soporte API
          </summary>

          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={consultarTiposDocumentoDS}
                disabled={debugDsLoading}
                className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                Ver tipos DS
              </button>

              <button
                type="button"
                onClick={consultarDocumentosSoporte}
                disabled={debugDsLoading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Consultar primeros DS
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={debugDsId}
                onChange={(e) => setDebugDsId(e.target.value)}
                placeholder="ID Siigo del documento soporte"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={consultarDocumentoSoportePorId}
                disabled={debugDsLoading}
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                Consultar por ID
              </button>
            </div>

            {debugDsMsg && <MessageBox message={debugDsMsg} type="info" />}
            {debugDsJson && <JsonBlock title="Respuesta JSON de Siigo" data={debugDsJson} />}
          </div>
        </details>

        <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Debug de factura
          </summary>
          <div className="mt-4">
            <DebugFacturaPanel />
          </div>
        </details>

        <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Debug de nota crédito
          </summary>
          <div className="mt-4">
            <DebugNotaCreditoPanel />
          </div>
        </details>

        <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Debug de compra
          </summary>
          <div className="mt-4">
            <DebugCompraPanel />
          </div>
        </details>
      </Card>


      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Historial de sincronizaciones Siigo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Revisa las últimas ejecuciones manuales y automáticas, su resultado y el detalle técnico.
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

                    const isOk = !isRunning && !hasError;

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
                                {item.origen === "cron"
                                  ? "Automática"
                                  : item.origen === "manual"
                                  ? "Manual"
                                  : item.origen === "manual_modulo"
                                  ? "Manual por módulo"
                                  : "Origen no identificado"}
                              </span>
                            </div>

                            <div className="mt-2 text-sm font-semibold text-slate-950">
                              Ejecutada: {formatDateTime(item.ejecutado_en, historyTimezone)}
                            </div>

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
                              <div className="font-bold text-slate-900">
                                {item.total_pasos || 0}
                              </div>
                              <div className="text-slate-500">Pasos</div>
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="font-bold text-emerald-700">
                                {item.pasos_ok || 0}
                              </div>
                              <div className="text-slate-500">OK</div>
                            </div>

                            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                              <div className="font-bold text-red-700">
                                {item.pasos_error || 0}
                              </div>
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