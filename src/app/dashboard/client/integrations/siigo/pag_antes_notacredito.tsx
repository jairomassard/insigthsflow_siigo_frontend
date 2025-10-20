"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

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
  const [syncMsg, setSyncMsg] = useState("");

  const [form, setForm] = useState({
    base_url: "",
    client_id: "",
    client_secret: "",
    username: "",
    password: "",
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
    setSyncMsg("");
    try {
      const url = `/siigo/sync-facturas${deep ? "?deep=1" : ""}`;
      const res = await authFetch(url, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res?.mensaje) setSyncMsg(res.mensaje);
      else if (res?.error) setSyncMsg("Error: " + res.error);
      else setSyncMsg("Error inesperado durante sincronización.");
    } catch (e: any) {
      setSyncMsg("Error: " + e.message);
    } finally {
      setSyncingFacturas(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Integración con Siigo</h2>

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
      )}


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
              setSyncMsg("");
              try {
                const res = await authFetch("/siigo/sync-catalogos", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsg(res.mensaje || res.error || "Listo");
              } catch (e: any) {
                setSyncMsg("Error: " + e.message);
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
              setSyncMsg("");
              try {
                const res = await authFetch("/siigo/sync-customers", {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setSyncMsg(res.mensaje || res.error || "Listo");
              } catch (e: any) {
                setSyncMsg("Error: " + e.message);
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
              {syncingFacturas ? "En Proceso…" : "Sincronizar (ligero)"}
            </button>

            <button
              onClick={async () => {
                setSyncingFacturas(true);
                setSyncMsg("");
                try {
                  // 100 por lote, solo faltantes
                  const res = await authFetch(
                    "/siigo/sync-facturas?deep=1&batch=100&only_missing=1",
                    { method: "POST", body: JSON.stringify({}) }
                  );
                  setSyncMsg(res.mensaje || res.error || "Listo");
                } catch (e: any) {
                  setSyncMsg("Error: " + e.message);
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
              {syncingFacturas ? "En Proceso…" : "Sincronizar (detallado – lote 100)"}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="mt-2 rounded border border-blue-100 bg-blue-50 p-2 text-sm text-blue-800">
            {syncMsg}
          </div>
        )}
      </div>

      {/* Debug de una factura (Siigo vs BD) */}
      <div className="mt-8 border-t pt-4">
        <h3 className="mb-3 text-lg font-medium">Debug de factura (Siigo vs BD)</h3>
        <DebugFacturaPanel />
      </div>
    </div>
  );
}


