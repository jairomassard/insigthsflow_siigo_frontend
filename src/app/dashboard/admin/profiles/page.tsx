"use client";

import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";
import PermisosModal from "@/components/PermisosModal";


type Cliente = { idcliente: number; nombre: string };
type Perfil = { idperfil: number; idcliente: number; nombre: string; descripcion?: string };

export default function ProfilesPage() {
  useAuthGuard();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ idcliente: "", nombre: "", descripcion: "" });

  const resetForm = () => setForm({ idcliente: "", nombre: "", descripcion: "" });

  const loadAll = async () => {
    try {
      setErr(""); setOk(""); setLoading(true);
      const [cls, pfs] = await Promise.all([
        authFetch("/clientes"),
        authFetch("/admin/perfiles"),
      ]);
      setClientes(cls);
      setPerfiles(pfs);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(""); setOk("");
    try {
      const payload = {
        idcliente: Number(form.idcliente),
        nombre: form.nombre,
        descripcion: form.descripcion || "",
      };
      if (editingId) {
        await authFetch(`/admin/perfiles/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setOk("Perfil actualizado.");
      } else {
        await authFetch("/admin/perfiles", { method: "POST", body: JSON.stringify(payload) });
        setOk("Perfil creado.");
      }
      resetForm(); setEditingId(null);
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (p: Perfil) => {
    setEditingId(p.idperfil);
    setForm({ idcliente: String(p.idcliente), nombre: p.nombre, descripcion: p.descripcion || "" });
    setErr(""); setOk("");
  };

  const onDelete = async (id: number) => {
    if (!confirm("¿Eliminar este perfil?")) return;
    setErr(""); setOk(""); setSaving(true);
    try {
      await authFetch(`/admin/perfiles/${id}`, { method: "DELETE" });
      setOk("Perfil eliminado.");
      if (editingId === id) { resetForm(); setEditingId(null); }
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const opcionesClientes = useMemo(
    () => clientes.map(c => ({ value: String(c.idcliente), label: c.nombre })),
    [clientes]
  );

  const [showPermisos, setShowPermisos] = useState<{ id: number; nombre: string } | null>(null);


  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Perfiles</h2>

      {err && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-600">{err}</div>}
      {ok && <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

      <form onSubmit={handleSubmit} className="mb-6 grid max-w-xl gap-3">
        <div>
          <label className="mb-1 block text-sm text-gray-700">Cliente *</label>
          <select
            className="w-full rounded border p-2"
            value={form.idcliente}
            onChange={(e) => setForm({ ...form, idcliente: e.target.value })}
            required
          >
            <option value="">Seleccione…</option>
            {opcionesClientes.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Nombre del perfil *</label>
          <input
            className="w-full rounded border p-2"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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

        <div className="flex gap-2">
          <button
            className={`rounded px-4 py-2 text-white ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
            disabled={saving}
          >
            {editingId ? (saving ? "Guardando…" : "Guardar") : (saving ? "Creando…" : "Crear perfil")}
          </button>
          {editingId && (
            <button
              type="button"
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              onClick={() => { setEditingId(null); resetForm(); setErr(""); setOk(""); }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Cliente</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">Descripción</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {perfiles.map((p) => {
                const cli = clientes.find(c => c.idcliente === p.idcliente);
                return (
                  <tr key={p.idperfil} className="odd:bg-white even:bg-gray-50">
                    <td className="border p-2">{p.idperfil}</td>
                    <td className="border p-2">{cli?.nombre || p.idcliente}</td>
                    <td className="border p-2">{p.nombre}</td>
                    <td className="border p-2">{p.descripcion || "-"}</td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
                          onClick={() => onEdit(p)}
                        >
                          Editar
                        </button>

                        <button
                          className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                          onClick={() => setShowPermisos({ id: p.idperfil, nombre: p.nombre })}
                        >
                          Permisos
                        </button>

                        <button
                          className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                          onClick={() => onDelete(p.idperfil)}
                        >
                          Eliminar
                        </button>
                      </div>

                    </td>
                  </tr>
                );
              })}
              {perfiles.length === 0 && (
                <tr><td className="p-3 text-center text-gray-500" colSpan={5}>No hay perfiles.</td></tr>
              )}
            </tbody>
          </table>

          {showPermisos && (
            <PermisosModal
              perfilId={showPermisos.id}
              perfilNombre={showPermisos.nombre}
              onClose={() => setShowPermisos(null)}
            />
          )}

        </div>
      )}
    </div>
  );
}
