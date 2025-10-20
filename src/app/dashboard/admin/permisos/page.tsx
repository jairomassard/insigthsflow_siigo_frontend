"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

type Permiso = {
  idpermiso: number;
  idcliente?: number | null;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activo: boolean;
};

export default function AdminPermisosPage() {
  useAuthGuard();

  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", codigo: "", descripcion: "", activo: true });

  const load = async () => {
    try {
      setLoading(true); setErr(""); setOk("");
      const data = await authFetch("/api/permisos");
      setPermisos(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ nombre: "", codigo: "", descripcion: "", activo: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(""); setOk("");
    try {
      const body = { ...form };
      if (editingId) {
        await authFetch(`/api/permisos/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
        setOk("Permiso actualizado correctamente.");
      } else {
        await authFetch(`/api/permisos`, { method: "POST", body: JSON.stringify(body) });
        setOk("Permiso creado correctamente.");
      }
      resetForm(); setEditingId(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (p: Permiso) => {
    setEditingId(p.idpermiso);
    setForm({ nombre: p.nombre, codigo: p.codigo, descripcion: p.descripcion || "", activo: p.activo });
  };

  const onDelete = async (id: number) => {
    if (!confirm("¿Eliminar este permiso?")) return;
    setSaving(true);
    try {
      await authFetch(`/api/permisos/${id}`, { method: "DELETE" });
      setOk("Permiso eliminado correctamente.");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Gestión de permisos base</h2>

      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      {ok && <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">{ok}</div>}

      <form onSubmit={submit} className="mb-6 grid max-w-xl gap-3">
        <div>
          <label className="mb-1 block text-sm text-gray-700">Nombre *</label>
          <input
            className="w-full rounded border p-2"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-700">Código *</label>
          <input
            className="w-full rounded border p-2"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-700">Descripción</label>
          <input
            className="w-full rounded border p-2"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
          />
          <label>Activo</label>
        </div>

        <div className="flex gap-2">
          <button
            disabled={saving}
            className={`rounded px-4 py-2 text-white ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {editingId ? (saving ? "Guardando…" : "Guardar") : (saving ? "Creando…" : "Crear")}
          </button>
          {editingId && (
            <button
              type="button"
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              onClick={() => { resetForm(); setEditingId(null); }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Cargando permisos…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">Código</th>
                <th className="border p-2">Descripción</th>
                <th className="border p-2">Activo</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {permisos.map((p) => (
                <tr key={p.idpermiso} className="odd:bg-white even:bg-gray-50">
                  <td className="border p-2">{p.idpermiso}</td>
                  <td className="border p-2">{p.nombre}</td>
                  <td className="border p-2 font-mono text-xs">{p.codigo}</td>
                  <td className="border p-2 text-sm">{p.descripcion || "-"}</td>
                  <td className="border p-2 text-center">{p.activo ? "✅" : "❌"}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button className="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600" onClick={() => onEdit(p)}>Editar</button>
                      <button className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700" onClick={() => onDelete(p.idpermiso)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
