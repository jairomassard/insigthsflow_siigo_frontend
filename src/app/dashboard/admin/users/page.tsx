"use client";

import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

type Cliente = { idcliente: number; nombre: string };
type Perfil = { idperfil: number; idcliente: number; nombre: string };
type Usuario = {
  idusuario: number;
  idcliente: number | null;
  idperfil: number | null;
  nombre: string;
  apellido?: string | null;
  email: string;
  activo: boolean;
};

export default function UsersPage() {
  useAuthGuard();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    idcliente: "",
    idperfil: "",
    nombre: "",
    apellido: "",
    email: "",
    password: "",
  });

  const resetForm = () =>
    setForm({ idcliente: "", idperfil: "", nombre: "", apellido: "", email: "", password: "" });

  const loadAll = async () => {
    try {
      setLoading(true); setErr(""); setOk("");
      const [cls, pfs, us] = await Promise.all([
        authFetch("/clientes"),
        authFetch("/admin/perfiles"),
        authFetch("/admin/usuarios"),
      ]);
      setClientes(cls);
      setPerfiles(pfs);
      setUsuarios(us);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const perfilesFiltrados = useMemo(() => {
    const cid = Number(form.idcliente);
    return perfiles.filter(p => p.idcliente === cid);
  }, [perfiles, form.idcliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(""); setOk("");
    try {
      const payload: any = {
        idcliente: Number(form.idcliente),
        idperfil: Number(form.idperfil),
        nombre: form.nombre,
        apellido: form.apellido || null,
        email: form.email,
      };
      if (editingId) {
        // contraseña opcional en edición
        if (form.password.trim()) payload.password = form.password;
        await authFetch(`/admin/usuarios/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setOk("Usuario actualizado.");
      } else {
        payload.password = form.password;
        await authFetch("/admin/usuarios", { method: "POST", body: JSON.stringify(payload) });
        setOk("Usuario creado.");
      }
      resetForm(); setEditingId(null);
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (u: Usuario) => {
    setEditingId(u.idusuario);
    setForm({
      idcliente: u.idcliente ? String(u.idcliente) : "",
      idperfil: u.idperfil ? String(u.idperfil) : "",
      nombre: u.nombre || "",
      apellido: u.apellido || "",
      email: u.email || "",
      password: "", // vacío; solo se envía si el admin escribe una nueva
    });
    setErr(""); setOk("");
  };

  const onDelete = async (id: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    setSaving(true); setErr(""); setOk("");
    try {
      await authFetch(`/admin/usuarios/${id}`, { method: "DELETE" });
      setOk("Usuario eliminado.");
      if (editingId === id) { resetForm(); setEditingId(null); }
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Usuarios</h2>

      {err && <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-600">{err}</div>}
      {ok && <div className="mb-3 rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

      <form onSubmit={handleSubmit} className="mb-6 grid max-w-xl gap-3">
        <div>
          <label className="mb-1 block text-sm text-gray-700">Cliente *</label>
          <select
            className="w-full rounded border p-2"
            value={form.idcliente}
            onChange={(e) => setForm({ ...form, idcliente: e.target.value, idperfil: "" })}
            required
          >
            <option value="">Seleccione…</option>
            {clientes.map((c) => (
              <option key={c.idcliente} value={c.idcliente}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Perfil *</label>
          <select
            className="w-full rounded border p-2"
            value={form.idperfil}
            onChange={(e) => setForm({ ...form, idperfil: e.target.value })}
            required
            disabled={!form.idcliente}
          >
            <option value="">{form.idcliente ? "Seleccione…" : "Seleccione un cliente primero"}</option>
            {perfilesFiltrados.map((p) => (
              <option key={p.idperfil} value={p.idperfil}>{p.nombre}</option>
            ))}
          </select>
        </div>

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
          <label className="mb-1 block text-sm text-gray-700">Apellido *</label>
          <input
            className="w-full rounded border p-2"
            value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Email *</label>
          <input
            className="w-full rounded border p-2"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">
            {editingId ? "Nueva contraseña (opcional)" : "Contraseña *"}
          </label>
          <input
            className="w-full rounded border p-2"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
          />
        </div>

        <div className="flex gap-2">
          <button
            className={`rounded px-4 py-2 text-white ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
            disabled={saving}
          >
            {editingId ? (saving ? "Guardando…" : "Guardar") : (saving ? "Creando…" : "Crear usuario")}
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
          <table className="w-full min-w-[1000px] border">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Cliente</th>
                <th className="border p-2">Perfil</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">Apellido</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Activo</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const cli = clientes.find(c => c.idcliente === u.idcliente);
                const pf = perfiles.find(p => p.idperfil === u.idperfil);
                return (
                  <tr key={u.idusuario} className="odd:bg-white even:bg-gray-50">
                    <td className="border p-2">{u.idusuario}</td>
                    <td className="border p-2">{cli?.nombre || u.idcliente}</td>
                    <td className="border p-2">{pf?.nombre || u.idperfil}</td>
                    <td className="border p-2">{u.nombre}</td>
                    <td className="border p-2">{u.apellido || "-"}</td>
                    <td className="border p-2">{u.email}</td>
                    <td className="border p-2">{u.activo ? "Sí" : "No"}</td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
                          onClick={() => onEdit(u)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                          onClick={() => onDelete(u.idusuario)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && (
                <tr><td className="p-3 text-center text-gray-500" colSpan={8}>No hay usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
