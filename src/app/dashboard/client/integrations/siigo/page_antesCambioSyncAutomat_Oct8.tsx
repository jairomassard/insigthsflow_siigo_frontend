"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";
/**import CargarProveedores from "../../../../../components/CargarProveedores"; */

import CargarDocumentosSoporte from "../../../../../components/CargarDocumentosSoporte";

import CargarNomina from "../../../../../components/CargarNomina";



/** --------------------------
 *  Panel de Debug de Factura
 *  --------------------------
 *  Usa authFetch (lleva el JWT) para consultar tu endpoint /siigo/debug-invoice
 *  Puedes consultar por name (FV-...) o por uuid (Siigo).
 */
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
      const res = await authFetch(`/siigo/debug-invoice${qs}`);
      if (res?.error) setErr(String(res.error));
      else setOut(res);
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
        setErr("Ingresa name (NC-...) o UUID de la nota crédito");
        setLoading(false);
        return;
      }
      const res = await authFetch(`/siigo/debug-nota-credito${qs}`);
      if (res?.error) setErr(String(res.error));
      else setOut(res);
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
      const res = await authFetch(`/siigo/debug-compra${qs}`);
      if (res?.error) setErr(String(res.error));
      else setOut(res);
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


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingFacturas, setSyncingFacturas] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [syncMsgFacturas, setSyncMsgFacturas] = useState("");
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
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
      const res = await authFetch(url, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res?.mensaje) setSyncMsgFacturas(res.mensaje);

      else if (res?.error) setSyncMsgFacturas("Error: " + res.error);
      else setSyncMsgFacturas("Error inesperado durante sincronización.");
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
      const res = await authFetch("/siigo/sync-notas-credito", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSyncMsgNotasCredito(res?.mensaje || res?.error || "Sincronización completa");
    } catch (e: any) {
      setSyncMsgNotasCredito("Error: " + e.message);
    } finally {
      setSyncingFacturas(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Panel de integración con Siigo</h2>

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

      {/* Sección de sincronizaciones */}

      <div className="mt-8 border-t pt-4">
        <h2 className="mb-3 text-lg font-medium">Sincronizaciones</h2>

        {/* Sincronización de Catálogos Siigo */}
        <div className="flex items-center justify-between border-b py-2">
          <span>Sincronización de Catálogos (vendedores y centros de costo)</span>
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgFacturas("");
              try {
                const res = await authFetch("/siigo/sync-catalogos", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsgFacturas(res.mensaje || res.error || "Listo");
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
                const res = await authFetch("/siigo/sync-customers", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsgFacturas(res.mensaje || res.error || "Listo");
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
                const res = await authFetch("/siigo/sync-proveedores", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsgProveedores(res.mensaje || res.error || "Sincronización de proveedores completa");
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
                const res = await authFetch("/siigo/sync-productos", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsgProductos(res.mensaje || res.error || "Sincronización de productos completa");
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
                  // 100 por lote, solo faltantes
                  const res = await authFetch(
                    "/siigo/sync-facturas?deep=1&batch=100&only_missing=1",
                    { method: "POST", body: JSON.stringify({}) }
                  );
                  setSyncMsgFacturas(res.mensaje || res.error || "Listo");
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
                const res = await authFetch("/siigo/sync-compras", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsgCompras(res.mensaje || res.error || "Sincronización completa");
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

          {/*
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgCompras("");
              try {
                const res = await authFetch(
                  "/siigo/sync-compras?deep=1&batch=100&only_missing=1",
                  {
                    method: "POST",
                    body: JSON.stringify({}),
                  }
                );
                setSyncMsgCompras(res.mensaje || res.error || "Sincronización detallada completa");
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
            title="Sincronizar compras detallado – lote 100"
          >
            {syncingFacturas ? "En proceso…" : "Sincronizar compras (detallado – lote 100)"}
          </button> */}
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



      {/* --- Sincronización de pagos Siigo + revisión de estado --- 
      <div className="flex flex-col gap-2 border-b py-4">
        <span className="text-base font-medium">Gestión de Pagos a Proveedores</span>

        <div className="flex flex-wrap gap-2">
          {/* Paso 1: Sincronizar pagos desde Siigo *
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgPagosEgresos("");
              try {
                const res = await authFetch("/siigo/sync-pagos-egresos?deep=1&batch=100&only_missing=1", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsgPagosEgresos(res.mensaje || res.error || "Pagos sincronizados.");
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
            title="Carga los pagos de Siigo a la base de datos local"
          >
            {syncingFacturas ? "Sincronizando pagos…" : "1️⃣ Sincronizar pagos de Siigo"}
          </button>

          {/* Paso 2: Cruzar pagos con facturas locales *
          <button
            onClick={async () => {
              setSyncingFacturas(true);
              setSyncMsgPagosEgresos("");
              try {
                const res = await authFetch("/siigo/actualizar-estado-pagos", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                const resumen = res || {};
                const estados = resumen.resumen_estados || {};

                const msg = `
                🧾 Revisión completada:
                ✔️ Pagos revisados: ${resumen.pagos_actualizados ?? "?"}
                📄 Facturas evaluadas: ${resumen.facturas_actualizadas ?? "?"}

                📊 Estado de los pagos:
                ✅ SI: ${estados.SI ?? 0}
                ❌ NO: ${estados.NO ?? 0}
                ⚠️ PARCIAL: ${estados.PARCIAL ?? 0}
                🔍 Sin estado: ${estados.NULL ?? 0}
                `;

                setSyncMsgPagosEgresos(msg);
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
            title="Cruza pagos con facturas para determinar si están pagadas"
          >
            {syncingFacturas ? "Revisando pagos…" : "2️⃣ Revisar estado de pago"}
          </button>
        </div>

        {syncMsgPagosEgresos && (
          <div className="mt-2 whitespace-pre-line rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
            {syncMsgPagosEgresos}
          </div>
        )}
      </div>  */}


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
                const res = await authFetch("/siigo/sync-accounts-payable", { method: "POST" });
                setSyncMsgPagosEgresos(res.mensaje || "Sincronización completa");
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
                const res = await authFetch("/siigo/cross-accounts-payable", { method: "POST" });
                setSyncMsgPagosEgresos(res.mensaje || "Cruce completo");
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

 
    {/* 🔒 Sección de Debug (oculta temporalmente)
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
    */}



    </div>

  );
}



