"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";
import PermisosModal from "@/components/PermisosModal";


type Perfil = { idperfil: number; idcliente: number; nombre: string; descripcion?: string };

export default function ClientProfilesPage() {
  useAuthGuard();

  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });

  const resetForm = () => setForm({ nombre: "", descripcion: "" });

  const load = async () => {
    try {
      setLoading(true); setErr(""); setOk("");
      const data = await authFetch("/admin/perfiles"); // backend filtra por cliente si no es superadmin
      setPerfiles(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(""); setOk("");
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || "",
      };
      if (editingId) {
        await authFetch(`/perfiles/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setOk("Perfil actualizado.");
      } else {
        await authFetch(`/perfiles`, { method: "POST", body: JSON.stringify(payload) });
        setOk("Perfil creado.");
      }
      resetForm(); setEditingId(null);
      await load();
    } catch (e:any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (p: Perfil) => {
    setEditingId(p.idperfil);
    setForm({ nombre: p.nombre, descripcion: p.descripcion || "" });
    setErr(""); setOk("");
  };

  const onDelete = async (id: number) => {
    if (!confirm("¿Eliminar este perfil?")) return;
    setSaving(true); setErr(""); setOk("");
    try {
      await authFetch(`/perfiles/${id}`, { method: "DELETE" });
      setOk("Perfil eliminado.");
      if (editingId === id) { resetForm(); setEditingId(null); }
      await load();
    } catch (e:any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const [showPermisos, setShowPermisos] = useState<{ id: number; nombre: string } | null>(null);



  return (
    <div>
      <div className="space-y-1">
        <h1 className="mb-4 text-2xl font-bold">🧑‍💼 Perfiles (Cliente)</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Configura diferentes perfiles y asigna permisos de acceso a diferentes funcionalidades dentro del sistema.
          </p>
          <hr className="border-gray-900 mt-1" />
      </div>
      {err && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-600">{err}</div>}
      {ok &&  <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

    <div className="mt-8">
      <form onSubmit={submit} className="mb-6 grid max-w-xl gap-3">

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
    </div>

      {loading ? (
        <p>Cargando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">Descripción</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {perfiles.map((p) => (
                <tr key={p.idperfil} className="odd:bg-white even:bg-gray-50">
                  <td className="border p-2">{p.idperfil}</td>
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
              ))}
              {perfiles.length === 0 && (
                <tr><td className="p-3 text-center text-gray-500" colSpan={4}>No hay perfiles.</td></tr>
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
