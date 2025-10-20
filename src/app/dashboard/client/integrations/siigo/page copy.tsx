"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

export default function SiigoIntegrationPage() {
  useAuthGuard();

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

  const [masks, setMasks] = useState({
    client_secret_mask: null,
    password_mask: null,
    updated_at: null,
  });

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
      setOk("Configuraci\u00f3n guardada.");
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
      const res = await authFetch("/siigo/test_auth", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setOk("\u00a1Conexi\u00f3n exitosa con Siigo! Token v\u00e1lido.");
      } else {
        setErr(typeof res.error === "string" ? res.error : "No fue posible autenticar contra Siigo.");
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setTesting(false);
    }
  };

  const syncFacturas = async () => {
    setSyncingFacturas(true);
    setSyncMsg("");
    try {
      const res = await authFetch("/siigo/sync-facturas", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.mensaje) {
        setSyncMsg(res.mensaje);
      } else if (res.error) {
        setSyncMsg("Error: " + res.error);
      } else {
        setSyncMsg("Error inesperado durante sincronizaci\u00f3n.");
      }
    } catch (e: any) {
      setSyncMsg("Error: " + e.message);
    } finally {
      setSyncingFacturas(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Integraci\u00f3n con Siigo</h2>

      <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <p className="font-medium">Instrucciones:</p>
        <ul className="ml-4 list-disc">
          <li>
            <b>Base URL</b>: normalmente <code className="rounded bg-white/70 px-1">https://api.siigo.com/</code>
          </li>
          <li><b>Client ID</b> = Usuario API (correo creado en Siigo para API).</li>
          <li><b>Client Secret</b> = Access Key (cadena que te da Siigo).</li>
          <li>
            <b>Username</b> y <b>Password</b> no son necesarios para la API p\u00fablica (déjalos vac\u00edos salvo que tu flujo lo requiera).
          </li>
        </ul>
      </div>

      {err && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-600">{err}</div>}
      {ok && <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

      {!loading && (
        <form onSubmit={save} className="grid max-w-xl gap-3">
          {/* campos */}
          <div>
            <label className="mb-1 block text-sm text-gray-700">Base URL</label>
            <input className="w-full rounded border p-2" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Client ID</label>
            <input className="w-full rounded border p-2" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">
              Client Secret {masks.client_secret_mask ? `(actual: ${masks.client_secret_mask})` : ""}
            </label>
            <input className="w-full rounded border p-2" type="password" value={form.client_secret} onChange={(e) => setForm({ ...form, client_secret: e.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Username</label>
            <input className="w-full rounded border p-2" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Password {masks.password_mask ? `(actual: ${masks.password_mask})` : ""}</label>
            <input className="w-full rounded border p-2" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <div className="text-xs text-gray-500">
            {masks.updated_at ? `\u00daltima actualizaci\u00f3n: ${new Date(masks.updated_at).toLocaleString()}` : ""}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className={`rounded px-4 py-2 text-white ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`} disabled={saving || testing}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300" onClick={load} disabled={saving || testing}>
              Restablecer
            </button>
            <button type="button" className={`rounded px-4 py-2 text-white ${testing ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"}`} onClick={testConnection} disabled={saving || testing}>
              {testing ? "Probando…" : "Probar conexi\u00f3n"}
            </button>
          </div>
        </form>
      )}

      {/* Seccion de sincronizaciones */}
      <div className="mt-8 border-t pt-4">
        <h3 className="mb-3 text-lg font-medium">Sincronizaciones</h3>
        <div className="flex justify-between items-center border-b py-2">
          <span>Sincronización de Facturas de Venta</span>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setSyncingFacturas(true); setSyncMsg("");
                try {
                  const res = await authFetch("/siigo/sync-facturas", { method: "POST", body: JSON.stringify({}) });
                  setSyncMsg(res.mensaje || res.error || "Listo");
                } catch (e:any) { setSyncMsg("Error: " + e.message); }
                finally { setSyncingFacturas(false); }
              }}
              disabled={syncingFacturas}
              className={`rounded px-4 py-2 text-white ${syncingFacturas ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
            >
              {syncingFacturas ? "En Proceso…" : "Sincronizar (ligero)"}
            </button>

            <button
              onClick={async () => {
                setSyncingFacturas(true); setSyncMsg("");
                try {
                  const res = await authFetch("/siigo/sync-facturas?deep=1", { method: "POST", body: JSON.stringify({}) });
                  setSyncMsg(res.mensaje || res.error || "Listo");
                } catch (e:any) { setSyncMsg("Error: " + e.message); }
                finally { setSyncingFacturas(false); }
              }}
              disabled={syncingFacturas}
              className={`rounded px-4 py-2 text-white ${syncingFacturas ? "bg-purple-400" : "bg-purple-600 hover:bg-purple-700"}`}
              title="Trae impuestos, pagos, subtotal, descuentos, etc."
            >
              {syncingFacturas ? "En Proceso…" : "Sincronizar (detallado)"}
            </button>
          </div>
        </div>

        {syncMsg && <div className="mt-2 text-sm text-blue-800">{syncMsg}</div>}
      </div>
    </div>
  );
}
