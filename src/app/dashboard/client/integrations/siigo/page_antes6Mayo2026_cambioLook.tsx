"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";
/**import CargarProveedores from "../../../../../components/CargarProveedores"; */

import CargarDocumentosSoporte from "../../../../../components/CargarDocumentosSoporte";

import CargarNomina from "../../../../../components/CargarNomina";

import { getToken } from "@/lib/api";
import { jwtDecode } from "jwt-decode";
import { API } from "@/lib/api";




/** --------------------------
 *  Panel de Debug de Factura
 *  --------------------------
 *  Usa authFetch (lleva el JWT) para consultar tu endpoint /siigo/debug-invoice
 *  Puedes consultar por name (FV-...) o por uuid (Siigo).
 */


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
        setErr("Ingresa name (FV-...) o UUID");
        setLoading(false);
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
    <div className="rounded border p-3 space-y-3">
      <div className="text-sm text-gray-600">
        Ingresa <b>name</b> (ej: <code>FV-2-1674</code>) o <b>UUID</b> de Siigo. Solo uno.
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Name (FV-...)</label>
          <input
            className="w-full rounded border p-2"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value) setUuid("");
            }}
            placeholder="FV-2-1674"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">UUID (Siigo)</label>
          <input
            className="w-full rounded border p-2"
            value={uuid}
            onChange={(e) => {
              setUuid(e.target.value);
              if (e.target.value) setName("");
            }}
            placeholder="e.g. 9b3c0f9a-...."
          />
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className={`rounded px-4 py-2 text-white ${
          loading ? "bg-slate-400" : "bg-slate-700 hover:bg-slate-800"
        }`}
      >
        {loading ? "Consultando…" : "Ver detalle"}
      </button>

      {err && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}

      {out && (
        <details open className="rounded bg-gray-50 p-2">
          <summary className="cursor-pointer text-sm font-medium">Resultado</summary>
          <pre className="overflow-auto text-xs p-2">{JSON.stringify(out, null, 2)}</pre>
        </details>
      )}
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
        setErr("Ingresa name (NC-...) o UUID");
        setLoading(false);
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
    <div className="rounded border p-3 space-y-3">
      <div className="text-sm text-gray-600">
        Ingresa <b>name</b> (ej: <code>NC-1234</code>) o <b>UUID</b> de la nota crédito. Solo uno.
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Name (NC-...)</label>
          <input
            className="w-full rounded border p-2"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value) setUuid("");
            }}
            placeholder="NC-1234"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">UUID (Siigo)</label>
          <input
            className="w-full rounded border p-2"
            value={uuid}
            onChange={(e) => {
              setUuid(e.target.value);
              if (e.target.value) setName("");
            }}
            placeholder="e.g. 9b3c0f9a-...."
          />
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className={`rounded px-4 py-2 text-white ${
          loading ? "bg-slate-400" : "bg-slate-700 hover:bg-slate-800"
        }`}
      >
        {loading ? "Consultando…" : "Ver detalle nota crédito"}
      </button>

      {err && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}

      {out && (
        <details open className="rounded bg-gray-50 p-2">
          <summary className="cursor-pointer text-sm font-medium">Resultado Nota Crédito</summary>
          <pre className="overflow-auto text-xs p-2">{JSON.stringify(out, null, 2)}</pre>
        </details>
      )}
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
        setErr("Ingresa idcompra o UUID");
        setLoading(false);
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
    <div className="rounded border p-3 space-y-3">
      <div className="text-sm text-gray-600">
        Ingresa <b>idcompra</b> o <b>UUID</b> de Siigo. Solo uno.
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">ID Compra</label>
          <input
            className="w-full rounded border p-2"
            value={idcompra}
            onChange={(e) => {
              setIdcompra(e.target.value);
              if (e.target.value) setUuid("");
            }}
            placeholder="Ej. DS-0001"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">UUID</label>
          <input
            className="w-full rounded border p-2"
            value={uuid}
            onChange={(e) => {
              setUuid(e.target.value);
              if (e.target.value) setIdcompra("");
            }}
            placeholder="e.g. 9b3c0f9a-...."
          />
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className={`rounded px-4 py-2 text-white ${
          loading ? "bg-slate-400" : "bg-slate-700 hover:bg-slate-800"
        }`}
      >
        {loading ? "Consultando…" : "Ver detalle compra"}
      </button>

      {err && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}

      {out && (
        <details open className="rounded bg-gray-50 p-2">
          <summary className="cursor-pointer text-sm font-medium">Resultado compra</summary>
          <pre className="overflow-auto text-xs p-2">{JSON.stringify(out, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}



export default function SiigoIntegrationPage() {
  useAuthGuard();

  const [pendientes, setPendientes] = useState<number | null>(null);

  useEffect(() => {
    authFetch("/siigo/sync-pendientes")
      .then(async (res) => {
        // Si authFetch devuelve un Response estándar
        const data = res.json ? await res.json() : res;
        console.log("Sync pendientes:", data);
        setPendientes(data.pendientes);
      })
      .catch((err) => {
        console.error("Error al consultar pendientes:", err);
      });
  }, []);

  const [debugDsLoading, setDebugDsLoading] = useState(false);
  const [debugDsMsg, setDebugDsMsg] = useState("");
  const [debugDsJson, setDebugDsJson] = useState<any>(null);
  const [debugDsId, setDebugDsId] = useState("");

  const [syncDsStagingLoading, setSyncDsStagingLoading] = useState(false);
  const [syncDsStagingMsg, setSyncDsStagingMsg] = useState("");
  const [syncDsStagingJson, setSyncDsStagingJson] = useState<any>(null);
  const [syncDsMaxPages, setSyncDsMaxPages] = useState("1");
  const [syncDsBatch, setSyncDsBatch] = useState("5");

  const [insertDsLoading, setInsertDsLoading] = useState(false);
  const [insertDsMsg, setInsertDsMsg] = useState("");
  const [insertDsJson, setInsertDsJson] = useState<any>(null);
  const [insertDsFechaDesde, setInsertDsFechaDesde] = useState("");

  const [dsFechaDesdeConfig, setDsFechaDesdeConfig] = useState("");


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingFacturas, setSyncingFacturas] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [syncMsgFacturas, setSyncMsgFacturas] = useState("");
  const [syncLogCompleto, setSyncLogCompleto] = useState(""); // 👈 nuevo
  const [syncMsgAuto, setSyncMsgAuto] = useState<string>(""); // Mensaje exclusivo para sync automática


  const [syncMsgNotasCredito, setSyncMsgNotasCredito] = useState("");

  const [syncMsgPagosEgresos, setSyncMsgPagosEgresos] = useState("");


  const [syncMsgCompras, setSyncMsgCompras] = useState("");

  const [syncingProveedores, setSyncingProveedores] = useState(false);
  const [syncMsgProveedores, setSyncMsgProveedores] = useState("");

  const [syncingProductos, setSyncingProductos] = useState(false);
  const [syncMsgProductos, setSyncMsgProductos] = useState("");



  const [form, setForm] = useState({
    base_url: "",
    client_id: "",
    client_secret: "",
    username: "",
    password: "",
    partner_id: "", // <-- nuevo
  });

  const [masks, setMasks] = useState<{
    client_secret_mask?: string | null;
    password_mask?: string | null;
    updated_at?: string | null;
  }>({});

  // Cargar configuración desde backend
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
        partner_id: data.partner_id || "", // <-- nuevo
      });
      setMasks({
        client_secret_mask: data.client_secret_mask,
        password_mask: data.password_mask,
        updated_at: data.updated_at,
      });

      const fechaDs = data?.ds_fecha_desde || "";
      setDsFechaDesdeConfig(fechaDs);
      setInsertDsFechaDesde(fechaDs);

    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [status, setStatus] = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState<string>("");   // ← agregado
  const [savingConfig, setSavingConfig] = useState<boolean>(false); // para deshabilitar botón

  useEffect(() => {
    authFetch("/config/siigo-sync-status")
      .then(async (res) => {
        // Si authFetch devuelve un Response estándar
        const data = res.json ? await res.json() : res;
        //console.log("🟢 Valor crudo recibido del backend:", data);

        //if (data?.ultimo_ejec) {
          //console.log("🕒 Valor crudo de 'ultimo_ejec':", data.ultimo_ejec);
         // console.log("📆 Interpretado con new Date():", new Date(data.ultimo_ejec));
          //console.log(
            //"🇨🇴 En hora local Bogotá:",
            //new Date(data.ultimo_ejec).toLocaleString("es-CO", { timeZone: "America/Bogota" })
          //);
        //}

        setStatus(data);

        const fechaDs = data?.ds_fecha_desde || "";
        setDsFechaDesdeConfig(fechaDs);
        setInsertDsFechaDesde(fechaDs);

      })
      .catch((err) => {
        console.error("❌ Error al consultar /config/siigo-sync-status:", err);
      });
  }, []);


  // Guardar configuración
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
        ds_fecha_desde: dsFechaDesdeConfig || null,
      };
      if (form.client_secret.trim()) payload.client_secret = form.client_secret.trim();
      if (form.password.trim()) payload.password = form.password.trim();
      if (form.partner_id.trim()) payload.partner_id = form.partner_id.trim();

      await authFetch("/config/siigo", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setOk("Configuración guardada.");
      await load(); // refresca máscaras
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };


    


  // Probar conexión contra Siigo
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
        setErr(
          typeof res.error === "string"
            ? res.error
            : "No fue posible autenticar contra Siigo."
        );
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setTesting(false);
    }
  };

  // Ejecutar sincronización (ligero o detallado)
  const runSync = async (deep = false) => {
    setSyncingFacturas(true);
    setSyncMsgFacturas("");
    try {
      const url = `/siigo/sync-facturas${deep ? "?deep=1" : ""}`;
      const res = await fetchWithIdCliente(url, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMsgFacturas(data?.mensaje || "");
      } else {
        setSyncMsgFacturas("Error: " + (data?.error || `HTTP ${res.status}`));
      }
    } catch (e: any) {
      setSyncMsgFacturas("Error: " + e.message);
    } finally {
      setSyncingFacturas(false);
    }
  };


  const syncNotasCredito = async () => {
    setSyncingFacturas(true);
    setSyncMsgNotasCredito("");
    try {
      const res = await fetchWithIdCliente("/siigo/sync-notas-credito", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSyncMsgNotasCredito(data?.mensaje || data?.error || "Sincronización completa");
    } catch (e: any) {
      setSyncMsgNotasCredito("Error: " + e.message);
    } finally {
      setSyncingFacturas(false);
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

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setDebugDsMsg("Tipos de documento DS consultados correctamente.");
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
      const res = await fetchWithIdCliente(
        "/siigo/debug-documentos-soporte?page_size=5&page=1",
        {
          method: "GET",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

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
      setDebugDsMsg("Primero escribe el ID del documento soporte que devuelve Siigo.");
      return;
    }

    setDebugDsLoading(true);
    setDebugDsMsg("");
    setDebugDsJson(null);

    try {
      const res = await fetchWithIdCliente(
        `/siigo/debug-documentos-soporte/${encodeURIComponent(debugDsId.trim())}`,
        {
          method: "GET",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setDebugDsMsg("Detalle de documento soporte consultado correctamente. No se guardó información.");
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
      const batch = syncDsBatch.trim() || "5";
      const maxPages = syncDsMaxPages.trim() || "1";

      const res = await fetchWithIdCliente(
        `/siigo/sync-documentos-soporte-staging?batch=${encodeURIComponent(
          batch
        )}&max_pages=${encodeURIComponent(maxPages)}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.detalle || `HTTP ${res.status}`);
      }

      setSyncDsStagingMsg(
        `Sincronización staging finalizada. Nuevas: ${
          data?.nuevas ?? 0
        }, actualizadas: ${data?.actualizadas ?? 0}, errores: ${
          data?.errores ?? 0
        }, omitidas: ${data?.omitidas ?? 0}.`
      );

      setSyncDsStagingJson(data);
    } catch (error: any) {
      setSyncDsStagingMsg(
        `Error sincronizando documentos soporte a staging: ${error.message}`
      );
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
          `Simulación finalizada. Candidatos encontrados: ${data?.candidatos ?? 0}. No se insertó información.`
        );
      } else {
        setInsertDsMsg(
          `Inserción finalizada. Insertadas: ${data?.insertadas ?? 0}, items insertados: ${
            data?.items_insertados ?? 0
          }, omitidas: ${data?.omitidas ?? 0}, errores: ${data?.errores ?? 0}.`
        );
      }

      setInsertDsJson(data);
    } catch (error: any) {
      setInsertDsMsg(`Error procesando DS desde staging: ${error.message}`);
    } finally {
      setInsertDsLoading(false);
    }
  };


  return (
    <div>
      <div className="space-y-1">
        <h1 className="mb-4 text-2xl font-bold">🔌 Panel de integración con Siigo</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Configura tus credenciales API y realiza la sincronización de la data que hay en tu sistema al de InsightsFlow.
          </p>
          <hr className="border-gray-900 mt-1" />
      </div>
      {/*
      {pendientes !== null && pendientes > 0 && (
        <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          ⚠️ <strong>{pendientes}</strong> facturas aún no están completamente enriquecidas o requieren actualización
          (estado de pago, impuestos, etc). Puedes usar la opción <em>"Sincronizar (detallado – lote 100)"</em> para
          procesarlas por lotes.
        </div>
      )}

      {pendientes !== null && pendientes === 0 && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          ✅ Todas las facturas están completamente sincronizadas y actualizadas.
        </div>
      )} */}

    <div className="mt-6">
      {/* Nota de uso */}
      <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <p className="font-medium">Instrucciones:</p>
        <ul className="ml-4 list-disc">
          <li>
            <b>Base URL</b>: normalmente{" "}
            <code className="rounded bg-white/70 px-1">https://api.siigo.com/</code>
          </li>
          <li>
            <b>Client ID</b> = Usuario API (correo creado en Siigo para API).
          </li>
          <li>
            <b>Client Secret</b> = Access Key (cadena que te da Siigo).
          </li>
          <li>
            <b>Username</b> y <b>Password</b> no son necesarios para la API pública
            (déjalos vacíos salvo que tu flujo lo requiera).
          </li>
          <li>
            <b>Partner ID</b> = (solicitalo a Siigo, o por lo general es el nombre de la empresa en minúscula).
          </li>

        </ul>
      </div>

    </div>

      {err && (
        <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-600">{err}</div>
      )}
      {ok && (
        <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>
      )}

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <form onSubmit={save} className="grid max-w-xl gap-3">
          <div>
            <label className="mb-1 block text-sm text-gray-700">Base URL</label>
            <input
              className="w-full rounded border p-2"
              placeholder="https://api.siigo.com/..."
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Client ID</label>
            <input
              className="w-full rounded border p-2"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">
              Client Secret{" "}
              {masks.client_secret_mask ? `(actual: ${masks.client_secret_mask})` : ""}
            </label>
            <input
              className="w-full rounded border p-2"
              type="password"
              placeholder="••••••••"
              value={form.client_secret}
              onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Username</label>
            <input
              className="w-full rounded border p-2"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">
              Password {masks.password_mask ? `(actual: ${masks.password_mask})` : ""}
            </label>
            <input
              className="w-full rounded border p-2"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm text-gray-700">Partner ID</label>
            <input
              className="w-full rounded border p-2"
              placeholder="Ej: tuempresa"
              value={form.partner_id}
              onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
            />
          </div>

          <div className="text-xs text-gray-500">
            {masks.updated_at
              ? `Última actualización: ${new Date(masks.updated_at).toLocaleString()}`
              : ""}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded px-4 py-2 text-white ${
                saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
              disabled={saving || testing}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>

            <button
              type="button"
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              onClick={load}
              disabled={saving || testing}
            >
              Restablecer
            </button>

            <button
              type="button"
              className={`rounded px-4 py-2 text-white ${
                testing ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              onClick={testConnection}
              disabled={saving || testing}
            >
              {testing ? "Probando…" : "Probar conexión"}
            </button>
          </div>
        </form>
      )}

      {/* Sección de sincronización automatizada con configuración */}
      <div className="mt-8 border-t pt-4">
        <h3 className="mb-3 text-lg font-medium">
          ⏱️ Sincronización Automatizada / Manual
        </h3>

        {status && (
          <>
            <p className="text-sm text-gray-600">
              Última ejecución:{" "}
              <span className="font-medium">
                {status.ultimo_ejec
                  ? (() => {
                      try {
                        // Convertimos la cadena ISO y la mostramos con la zona que viene del backend
                        const tz = status.timezone || "America/Bogota";
                        const fecha = new Date(status.ultimo_ejec);
                        return fecha.toLocaleString("es-CO", { timeZone: tz });
                      } catch (err) {
                        console.error("Error mostrando fecha local:", err);
                        return status.ultimo_ejec; // fallback
                      }
                    })()
                  : "—"}

              </span>{" "}
              –{" "}
              <span
                className={
                  status.resultado === "OK"
                    ? "text-green-600 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {status.resultado}
              </span>
            </p>

            <p className="text-sm mt-2">
              <strong>🛠️ Actualmente configurados:</strong>{" "}
              <strong>⏰ Hora programada:</strong>{" "}
              {status.hora_ejecucion || "—"} &nbsp;|&nbsp;
              <strong>📆 Frecuencia:</strong>{" "}
              cada {status.frecuencia_dias || 1} día(s)
            </p>
          </>
        )}

        {/* Formulario para configurar */}
        <form
          className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
          onSubmit={async (e) => {
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
                  ds_fecha_desde: dsFechaDesdeConfig || null,
                }),
              });

              setSaveMsg("✅ Configuración guardada correctamente");

              const nuevo = await authFetch("/config/siigo-sync-status");
              setStatus(nuevo);

              const fechaDs = nuevo?.ds_fecha_desde || "";
              setDsFechaDesdeConfig(fechaDs);
              setInsertDsFechaDesde(fechaDs);
            } catch (err: any) {
              setSaveMsg("❌ Error al guardar configuración: " + err.message);
            } finally {
              setSavingConfig(false);
            }
          }}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col text-sm text-slate-700">
              Hora ejecución
              <input
                type="time"
                name="hora"
                defaultValue={status?.hora_ejecucion || "02:00"}
                className="mt-1 rounded border border-slate-300 p-2"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Frecuencia (días)
              <input
                type="number"
                min={1}
                name="frecuencia"
                defaultValue={status?.frecuencia_dias || 1}
                className="mt-1 w-full rounded border border-slate-300 p-2"
              />
            </label>

            <label className="flex flex-col text-sm text-slate-700">
              Fecha inicial DS API
              <input
                type="date"
                value={dsFechaDesdeConfig}
                onChange={(e) => {
                  setDsFechaDesdeConfig(e.target.value);
                  setInsertDsFechaDesde(e.target.value);
                }}
                className="mt-1 rounded border border-slate-300 p-2"
              />
            </label>

            <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
              <input
                type="checkbox"
                name="activo"
                defaultChecked={status?.activo !== false}
              />
              Activo
            </label>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            <strong>Documento Soporte API:</strong> si la fecha inicial DS queda vacía,
            se insertarán todos los documentos soporte aceptados que no existan en compras.
            Si defines una fecha, solo se insertarán documentos desde esa fecha.
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className={`rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 ${
              savingConfig ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {savingConfig ? "Guardando…" : "Guardar configuración"}
          </button>

          {saveMsg && <div className="mt-2 text-sm">{saveMsg}</div>}
        </form>

        {/* Botón para ejecutar sync-all */}
        <div className="flex items-center justify-between mt-6">
          <span>Ejecutar sincronización completa de Siigo (todos los pasos)</span>
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgAuto("");      // 👈 usamos el estado nuevo
              setSyncLogCompleto("");  // limpiar log completo antes de empezar

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
                    ds_fecha_desde: dsFechaDesdeConfig || null,
                  }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Fallo la sincronización");

                const fullLog = data.detalle || "";

                // 📝 Generar resumen amigable
                const lines: string[] = fullLog
                  .split("\n")
                  .filter((l: string) => l.trim().length > 0);

                const statusCodes = lines
                  .map((line: string) => {
                    const match = line.match(/->\s+(\d{3})/);
                    return match ? Number(match[1]) : null;
                  })
                  .filter((code: number | null): code is number => code !== null);

                const totalPasos = statusCodes.length;
                const exitos = statusCodes.filter((code: number) => code >= 200 && code < 400).length;
                const errores = statusCodes.filter((code: number) => code >= 400).length;

                const resumen = `📊 Sincronización completada: ${totalPasos} pasos ejecutados -> ✅ ${exitos} correctos, ❌ ${errores} con error.`;

                setSyncMsgAuto(resumen);     // 👈 mensaje corto para el usuario
                setSyncLogCompleto(fullLog); // 👈 log técnico aparte

                await authFetch("/config/siigo-sync-status").then(setStatus);
              } catch (e: any) {
                setSyncMsgAuto("Error: " + e.message);
              } finally {
                setSyncingFacturas(false);
              }
            }}
            disabled={syncingFacturas}
            className={`rounded px-4 py-2 text-white ${
              syncingFacturas ? "bg-gray-400" : "bg-gray-800 hover:bg-gray-900"
            }`}
            title="Ejecuta sincronización completa automáticamente"
          >
            {syncingFacturas ? "Sincronizando…" : "🔁 Ejecutar sync-all"}
          </button>
        </div>

        {/* Bloque de resultados */}
        {syncMsgAuto && (
          <div className="mt-2 rounded border border-green-100 bg-green-50 p-2 text-sm text-green-800">
            {syncMsgAuto}
          </div>
        )}

        {syncLogCompleto && (
          <details className="mt-2 rounded border bg-gray-50 p-2 text-sm text-gray-800">
            <summary className="cursor-pointer font-medium">
              Ver log completo (técnico)
            </summary>
            <pre className="overflow-auto text-xs p-2">{syncLogCompleto}</pre>
          </details>
        )}
      </div>


      {/* Sección de sincronizaciones Manuales */}

      <div className="mt-8 border-t pt-4">
        <h2 className="mb-3 text-lg font-medium">Sincronizaciones Manuales</h2>

        {/* Sincronización de Catálogos Siigo */}
        <div className="flex items-center justify-between border-b py-2">
          <span>Sincronización de Catálogos (vendedores y centros de costo)</span>
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgFacturas("");
              try {
                const token = getToken();
                const decoded: any = jwtDecode(token || "");
                const idcliente = decoded?.idcliente;

                const res = await fetch(`${API}/siigo/sync-catalogos`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "X-ID-CLIENTE": String(idcliente),
                  },
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                if (res.ok) {
                  setSyncMsgFacturas(data.mensaje || "");
                } else {
                  setSyncMsgFacturas("Error: " + (data.error || res.status));
                }
              } catch (e: any) {
                setSyncMsgFacturas("Error: " + e.message);
              } finally {
                setSyncingFacturas(false);
              }
            }}
            disabled={syncingFacturas}
            className={`rounded px-4 py-2 text-white ${
              syncingFacturas ? "bg-yellow-400" : "bg-yellow-600 hover:bg-yellow-700"
            }`}
            title="Carga vendedores y centros de costo desde Siigo"
          >
            {syncingFacturas ? "Sincronizando…" : "Sincronizar catálogos"}
          </button>
        </div>

        {/* Sincronización de Clientes Siigo */}
        <div className="flex items-center justify-between border-b py-2">
          <span>Sincronización de Clientes almacenados en Siigo</span>
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgFacturas("");
              try {
                const token = getToken();
                const decoded: any = jwtDecode(token || "");
                const idcliente = decoded?.idcliente;

                const res = await fetch(`${API}/siigo/sync-customers`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "X-ID-CLIENTE": String(idcliente),
                  },
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                if (res.ok) {
                  setSyncMsgFacturas(data.mensaje || "");
                } else {
                  setSyncMsgFacturas("Error: " + (data.error || res.status));
                }
              } catch (e: any) {
                setSyncMsgFacturas("Error: " + e.message);
              } finally {
                setSyncingFacturas(false);
              }
            }}
            disabled={syncingFacturas}
            className={`rounded px-4 py-2 text-white ${
              syncingFacturas ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
            }`}
            title="Carga clientes (terceros) desde Siigo"
          >
            {syncingFacturas ? "Sincronizando…" : "Sincronizar clientes"}
          </button>
        </div>

        {/* Cargue de Proveedores desde archivo Excel 
        <div className="py-4 border-b">
          <h3 className="text-sm font-medium mb-2">Cargar Proveedores desde Excel</h3>
          <p className="text-sm text-gray-600 mb-2">
            Exporta el reporte desde <b>Reportes &gt; Clientes y Proveedores &gt; Búsqueda de cliente, proveedor u otro</b> y
            usa el botón <b>Exportar a Excel</b>. Luego sube el archivo aquí.
          </p>
          <CargarProveedores />
        </div>  */}

        {/* Sincronización de Proveedores desde Siigo */}
        <div className="flex items-center justify-between border-b py-2">
          <span>Sincronización de Proveedores almacenados en Siigo</span>
          <button
            onClick={async () => {
              setSyncingProveedores(true);
              setSyncMsgProveedores("");
              try {
                const res = await fetchWithIdCliente("/siigo/sync-proveedores", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                setSyncMsgProveedores(data?.mensaje || data?.error || "Sincronización de proveedores completa");
              } catch (e: any) {
                setSyncMsgProveedores("Error: " + e.message);
              } finally {
                setSyncingProveedores(false);
              }
            }}
            disabled={syncingProveedores}
            className={`rounded px-4 py-2 text-white ${
              syncingProveedores ? "bg-sky-400" : "bg-sky-600 hover:bg-sky-700"
            }`}
            title="Carga proveedores desde Siigo"
          >
            {syncingProveedores ? "Sincronizando…" : "Sincronizar proveedores"}
          </button>
        </div>

        {syncMsgProveedores && (
          <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
            {syncMsgProveedores}
          </div>
        )}



        {/* Sincronización de Productos desde Siigo */}
        <div className="flex items-center justify-between border-b py-2">
          <span>Sincronización de Productos almacenados en Siigo</span>
          <button
            onClick={async () => {
              setSyncingProductos(true);
              setSyncMsgProductos("");
              try {
                const res = await fetchWithIdCliente("/siigo/sync-productos", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                setSyncMsgProductos(data?.mensaje || data?.error || "Sincronización de productos completa");
              } catch (e: any) {
                setSyncMsgProductos("Error: " + e.message);
              } finally {
                setSyncingProductos(false);
              }
            }}
            disabled={syncingProductos}
            className={`rounded px-4 py-2 text-white ${
              syncingProductos ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
            }`}
            title="Carga productos desde Siigo"
          >
            {syncingProductos ? "Sincronizando…" : "Sincronizar productos"}
          </button>
        </div>

        {syncMsgProductos && (
          <div className="mt-2 rounded border border-green-100 bg-green-50 p-2 text-sm text-green-800">
            {syncMsgProductos}
          </div>
        )}



        {/* Sincronización de Facturas de Venta */}
        <div className="flex items-center justify-between border-b py-2">
          <span>Sincronización de Facturas de Venta</span>

          <div className="flex gap-2">
            <button
              onClick={() => runSync(false)}
              disabled={syncingFacturas}
              className={`rounded px-4 py-2 text-white ${
                syncingFacturas ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {syncingFacturas ? "En Proceso…" : "1️⃣ Sincronizar (ligero)"}
            </button>

            <button
              onClick={async () => {
                setSyncingFacturas(true);
                setSyncMsgFacturas("");
                try {
                  const res = await fetchWithIdCliente("/siigo/sync-facturas?deep=1&batch=100&only_missing=1", {
                    method: "POST",
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  setSyncMsgFacturas(data?.mensaje || data?.error || "Listo");
                } catch (e: any) {
                  setSyncMsgFacturas("Error: " + e.message);
                } finally {
                  setSyncingFacturas(false);
                }
              }}
              disabled={syncingFacturas}
              className={`rounded px-4 py-2 text-white ${
                syncingFacturas ? "bg-purple-400" : "bg-purple-600 hover:bg-purple-700"
              }`}
              title="Trae impuestos, pagos, subtotal, descuentos, etc. (por lotes)"
            >
              {syncingFacturas ? "En Proceso…" : "2️⃣ Sincronizar (detallado – lote 100)"}
            </button>


          </div>
        </div>

        {syncMsgFacturas && (
          <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
            {syncMsgFacturas}
          </div>
        )}

      </div>

      {/* sincronización notas credito */}
      <div className="flex items-center justify-between border-b py-2">
        <span>Sincronización de Notas Crédito</span>
        <button
          onClick={syncNotasCredito}
          disabled={syncingFacturas}
          className={`rounded px-4 py-2 text-white ${
            syncingFacturas ? "bg-rose-400" : "bg-rose-600 hover:bg-rose-700"
          }`}
          title="Carga notas crédito desde Siigo"
        >
          {syncingFacturas ? "Sincronizando…" : "Sincronizar notas crédito"}
        </button>
      </div>

        {/* mensaje de sincronización */}
        {syncMsgNotasCredito && (
          <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
            {syncMsgNotasCredito}
          </div>
        )}


      {/* Sincronización de Compras / Documentos de Egreso */}
      <div className="flex items-center justify-between border-b py-2">
        <span>Sincronización de Compras / Soporte de Proveedor</span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgCompras("");
              try {
                const res = await fetchWithIdCliente("/siigo/sync-compras", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                setSyncMsgCompras(data?.mensaje || data?.error || "Sincronización completa");
              } catch (e: any) {
                setSyncMsgCompras("Error: " + e.message);
              } finally {
                setSyncingFacturas(false);
              }
            }}
            disabled={syncingFacturas}
            className={`rounded px-4 py-2 text-white ${
              syncingFacturas ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
            title="Carga compras desde Siigo (modo ligero)"
          >
            {syncingFacturas ? "Sincronizando compras…" : "1️⃣Sincronizar compras (ligero)"}
          </button>

        </div>
      </div>
      

      {syncMsgCompras && (
        <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
          {syncMsgCompras}
        </div>
      )}

      {/* Cargue de Documentos Soporte desde archivo Excel */}
      <div className="py-4 border-b">
        <h3 className="text-sm font-medium mb-2">Cargar Documentos Soporte desde Excel</h3>
        <p className="text-sm text-gray-600 mb-2">
          Exporta el reporte desde <b>Reportes &gt; Compras y Gastos &gt; Movimientos de documentos Compras &gt; Movimiento Factura de compra</b>. 
          En ese reporte, selecciona <b>Documento Soporte</b> en "Tipo de Transacción" y elige el <b>año, mes y rango de días</b> que deseas incluir.
          Luego, usa el botón <b>Exportar a Excel</b> y sube aquí el archivo generado.
        </p>
        <CargarDocumentosSoporte />
      </div>

      {/* Cargue de Documentos Soporte desde el API - Pruebas debug */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-amber-900">
            Exploración Documento Soporte API
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            Consulta temporal de solo lectura para revisar qué está devolviendo Siigo en el nuevo endpoint
            de Documento Soporte. Esta acción no guarda, no actualiza y no modifica información en InsightFlow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={consultarTiposDocumentoDS}
            disabled={debugDsLoading}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            Ver tipos DS
          </button>

          <button
            type="button"
            onClick={consultarDocumentosSoporte}
            disabled={debugDsLoading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Consultar primeros DS
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={debugDsId}
            onChange={(e) => setDebugDsId(e.target.value)}
            placeholder="ID Siigo del documento soporte"
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
          />

          <button
            type="button"
            onClick={consultarDocumentoSoportePorId}
            disabled={debugDsLoading}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            Consultar por ID
          </button>
        </div>

        {debugDsMsg && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-white p-3 text-sm text-amber-900">
            {debugDsMsg}
          </div>
        )}

        {debugDsJson && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Respuesta JSON de Siigo
            </div>

            <pre className="max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(debugDsJson, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Cargue de Doc soporte staging- panel monitoreo */}
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-emerald-900">
            Sincronización controlada de Documento Soporte a staging
          </h3>

          <p className="mt-1 text-sm text-emerald-800">
            Este proceso consulta documentos soporte desde Siigo API y los guarda únicamente
            en la tabla temporal <strong>siigo_documentos_soporte_api_staging</strong>.
            No toca compras, no toca ítems de compras y no afecta los reportes actuales.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[160px_160px_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-900">
              Batch
            </label>
            <input
              value={syncDsBatch}
              onChange={(e) => setSyncDsBatch(e.target.value)}
              placeholder="5"
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <p className="mt-1 text-xs text-emerald-700">
              Documentos por página.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-emerald-900">
              Máx. páginas
            </label>
            <input
              value={syncDsMaxPages}
              onChange={(e) => setSyncDsMaxPages(e.target.value)}
              placeholder="1"
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <p className="mt-1 text-xs text-emerald-700">
              Usa 1 para la primera prueba.
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={sincronizarDocumentosSoporteStaging}
              disabled={syncDsStagingLoading}
              className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 md:w-auto"
            >
              {syncDsStagingLoading
                ? "Sincronizando staging…"
                : "Sincronizar DS a staging"}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
          <strong>Recomendación:</strong> para la primera prueba deja Batch en{" "}
          <strong>5</strong> y Máx. páginas en <strong>1</strong>. Así validamos
          pocos documentos antes de traer los 1.364 registros que Siigo reportó.
        </div>

        {syncDsStagingMsg && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
            {syncDsStagingMsg}
          </div>
        )}

        {syncDsStagingJson && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resultado sincronización staging
            </div>

            <pre className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(syncDsStagingJson, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Sesion para Documento Soporte desde staging a siigo_compras */}
      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-blue-900">
            Insertar Documentos Soporte nuevos desde staging
          </h3>

          <p className="mt-1 text-sm text-blue-800">
            Este proceso toma únicamente documentos soporte nuevos, aceptados, con valor y con ítems desde la tabla
            staging y los inserta en <strong>siigo_compras</strong> y <strong>siigo_compras_items</strong>.
            No actualiza documentos existentes y no inserta documentos Failed, Draft, Rejected ni Sent.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-blue-900">
              Fecha desde
            </label>
            <input
              type="date"
              value={insertDsFechaDesde}
              onChange={(e) => setInsertDsFechaDesde(e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-blue-700">
              Usa la misma fecha configurada para Documento Soporte API. Si la dejas vacía, no se limita por fecha.
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => insertarDocumentosSoporteDesdeStaging(true)}
              disabled={insertDsLoading}
              className="w-full rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60 md:w-auto"
            >
              {insertDsLoading ? "Procesando…" : "Simular inserción"}
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => insertarDocumentosSoporteDesdeStaging(false)}
              disabled={insertDsLoading}
              className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 md:w-auto"
            >
              {insertDsLoading ? "Insertando…" : "Insertar DS nuevos"}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-900">
          <strong>Reglas aplicadas:</strong> solo nuevos, solo Accepted, total mayor a cero,
          con ítems y fecha mayor o igual a la fecha seleccionada. El saldo inicial se deja
          pendiente de corrección por sync-accounts-payable y cross-accounts-payable.
        </div>

        {insertDsMsg && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-900">
            {insertDsMsg}
          </div>
        )}

        {insertDsJson && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resultado inserción desde staging
            </div>

            <pre className="max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(insertDsJson, null, 2)}
            </pre>
          </div>
        )}
      </div>


      {/* --- Gestión de Cuentas por Pagar --- */}
      <div className="flex items-center justify-between border-b py-2">
        <span>Gestión de Cuentas por Pagar</span>

        <div className="flex gap-2">
          {/* Paso 1: Sincronizar desde Siigo */}
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgPagosEgresos("");
              try {
                const res = await fetchWithIdCliente("/siigo/sync-accounts-payable", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                setSyncMsgPagosEgresos(data?.mensaje || data?.error || "Sincronización completa");
              } catch (e: any) {
                setSyncMsgPagosEgresos("Error: " + e.message);
              } finally {
                setSyncingFacturas(false);
              }
            }}
            disabled={syncingFacturas}
            className={`rounded px-4 py-2 text-white ${
              syncingFacturas ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {syncingFacturas ? "Sincronizando…" : "1️⃣ Sincronizar cuentas por pagar"}
          </button>

          {/* Paso 2: Cruzar con compras locales */}
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgPagosEgresos("");
              try {
                const res = await fetchWithIdCliente("/siigo/cross-accounts-payable", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                const data = await res.json();
                setSyncMsgPagosEgresos(data?.mensaje || data?.error || "Cruce completo");
              } catch (e: any) {
                setSyncMsgPagosEgresos("Error: " + e.message);
              } finally {
                setSyncingFacturas(false);
              }
            }}
            disabled={syncingFacturas}
            className={`rounded px-4 py-2 text-white ${
              syncingFacturas ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {syncingFacturas ? "Cruzando…" : "2️⃣ Cruzar con compras"}
          </button>
        </div>

        {syncMsgPagosEgresos && (
          <div className="mt-2 whitespace-pre-line rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
            {syncMsgPagosEgresos}
          </div>
        )}
      </div>


      {/* Cargue de Nómina desde archivo Excel */}
      <div className="py-4 border-b">
        <h3 className="text-sm font-medium mb-2">Cargar Nómina desde Excel</h3>
        <p className="text-sm text-gray-600 mb-2">
          Exporta el reporte de nómina mensual en Siigo desde:  Nómina/Nóminas y escoge en la columna Nombre el reporte por mes a descargar, y lo subes en esta interfaz especificacndo el mes y año correspondiente a ese archivo descargado.
        </p>
        <CargarNomina />
      </div>

 
    {/* 🔒 Sección de Debug (oculta temporalmente)  */}
    <div className="mt-8 border-t pt-4">
      <h3 className="mb-3 text-lg font-medium">Debug de factura (Siigo vs BD)</h3>
      <DebugFacturaPanel />
    </div>

    <div className="mt-8 border-t pt-4">
      <h3 className="mb-3 text-lg font-medium">Debug de nota crédito (Siigo vs BD)</h3>
      <DebugNotaCreditoPanel />
    </div>

    <div className="mt-8 border-t pt-4">
      <h3 className="mb-3 text-lg font-medium">Debug de compra (Siigo vs BD)</h3>
      <DebugCompraPanel />
    </div>
  



    </div>

  );
}



