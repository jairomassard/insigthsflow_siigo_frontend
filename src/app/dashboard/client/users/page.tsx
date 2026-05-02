"use client";

import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

type Perfil = {
  idperfil: number;
  idcliente: number;
  nombre: string;
};

type Usuario = {
  idusuario: number;
  idcliente: number | null;
  idperfil: number | null;
  nombre: string;
  apellido?: string | null;
  email: string;
  activo: boolean;
};

export default function ClientUsersPage() {
  useAuthGuard();

  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    idperfil: "",
    nombre: "",
    apellido: "",
    email: "",
    password: "",
  });

  const resetForm = () =>
    setForm({
      idperfil: "",
      nombre: "",
      apellido: "",
      email: "",
      password: "",
    });

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      setOk("");

      const [pfs, us] = await Promise.all([
        authFetch("/perfiles"),
        authFetch("/usuarios"),
      ]);

      setPerfiles(pfs);
      setUsuarios(us);
    } catch (e: any) {
      setErr(e.message || "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const usuariosActivos = useMemo(
    () => usuarios.filter((u) => u.activo).length,
    [usuarios]
  );

  const usuariosInactivos = useMemo(
    () => usuarios.filter((u) => !u.activo).length,
    [usuarios]
  );

  const opcionesPerfiles = useMemo(
    () => perfiles.map((p) => ({ value: String(p.idperfil), label: p.nombre })),
    [perfiles]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload: any = {
        idperfil: Number(form.idperfil),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || null,
        email: form.email.trim().toLowerCase(),
      };

      if (editingId) {
        if (form.password.trim()) {
          payload.password = form.password;
        }

        await authFetch(`/usuarios/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setOk("Usuario actualizado correctamente.");
      } else {
        payload.password = form.password;

        await authFetch("/usuarios", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setOk("Usuario creado correctamente.");
      }

      resetForm();
      setEditingId(null);
      await load();
    } catch (e: any) {
      setErr(e.message || "Error al guardar usuario.");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (u: Usuario) => {
    setEditingId(u.idusuario);

    setForm({
      idperfil: u.idperfil ? String(u.idperfil) : "",
      nombre: u.nombre || "",
      apellido: u.apellido || "",
      email: u.email || "",
      password: "",
    });

    setErr("");
    setOk("");

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const onDelete = async (id: number) => {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) {
      return;
    }

    setSaving(true);
    setErr("");
    setOk("");

    try {
      await authFetch(`/usuarios/${id}`, {
        method: "DELETE",
      });

      setOk("Usuario eliminado correctamente.");

      if (editingId === id) {
        resetForm();
        setEditingId(null);
      }

      await load();
    } catch (e: any) {
      setErr(e.message || "No se pudo eliminar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActivo = async (u: Usuario) => {
    const nuevoEstado = !u.activo;

    const mensaje = nuevoEstado
      ? "¿Activar este usuario? Si el cliente ya alcanzó el límite contratado, el sistema no lo permitirá."
      : "¿Desactivar este usuario? Al desactivarlo liberará un cupo para crear otro usuario.";

    if (!confirm(mensaje)) return;

    setSaving(true);
    setErr("");
    setOk("");

    try {
      await authFetch(`/usuarios/${u.idusuario}`, {
        method: "PUT",
        body: JSON.stringify({
          activo: nuevoEstado,
        }),
      });

      setOk(
        nuevoEstado
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente. Este cupo ya puede usarse para crear otro usuario."
      );

      if (editingId === u.idusuario) {
        resetForm();
        setEditingId(null);
      }

      await load();
    } catch (e: any) {
      setErr(e.message || "No se pudo cambiar el estado del usuario.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Usuarios del cliente
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Crea, edita, activa o desactiva usuarios internos. Los usuarios
              inactivos no cuentan contra el límite contratado y liberan cupo
              para crear nuevos usuarios.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">Control de usuarios</div>
            <div>
              Activos: {usuariosActivos} · Inactivos: {usuariosInactivos}
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {ok}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Usuarios activos</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {usuariosActivos}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Son los que consumen cupo contratado.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Usuarios inactivos</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {usuariosInactivos}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            No consumen cupo y pueden reactivarse si hay disponibilidad.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Total registrados</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {usuarios.length}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Incluye usuarios activos e inactivos.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-5 shadow-sm"
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? "Editar usuario" : "Crear usuario"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Al crear un usuario nuevo, el backend valida automáticamente que no
            se supere el límite de usuarios activos contratado por el cliente.
          </p>
        </div>

        <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Perfil *
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.idperfil}
              onChange={(e) =>
                setForm({ ...form, idperfil: e.target.value })
              }
              required
            >
              <option value="">Seleccione…</option>
              {opcionesPerfiles.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre *
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.nombre}
              onChange={(e) =>
                setForm({ ...form, nombre: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Apellido *
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.apellido}
              onChange={(e) =>
                setForm({ ...form, apellido: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email *
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {editingId ? "Nueva contraseña opcional" : "Contraseña *"}
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              required={!editingId}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              saving
                ? "cursor-not-allowed bg-blue-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={saving}
          >
            {editingId
              ? saving
                ? "Guardando…"
                : "Guardar cambios"
              : saving
                ? "Creando…"
                : "Crear usuario"}
          </button>

          {editingId && (
            <button
              type="button"
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              onClick={() => {
                setEditingId(null);
                resetForm();
                setErr("");
                setOk("");
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500 shadow-sm">
          Cargando usuarios…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="border-b p-3 text-left">ID</th>
                <th className="border-b p-3 text-left">Perfil</th>
                <th className="border-b p-3 text-left">Nombre</th>
                <th className="border-b p-3 text-left">Apellido</th>
                <th className="border-b p-3 text-left">Email</th>
                <th className="border-b p-3 text-left">Estado</th>
                <th className="border-b p-3 text-left">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((u) => {
                const pf = perfiles.find((p) => p.idperfil === u.idperfil);

                return (
                  <tr
                    key={u.idusuario}
                    className="odd:bg-white even:bg-slate-50"
                  >
                    <td className="border-b p-3">{u.idusuario}</td>
                    <td className="border-b p-3">
                      {pf?.nombre || u.idperfil || "-"}
                    </td>
                    <td className="border-b p-3 font-medium text-slate-900">
                      {u.nombre}
                    </td>
                    <td className="border-b p-3">{u.apellido || "-"}</td>
                    <td className="border-b p-3">{u.email}</td>
                    <td className="border-b p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          u.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="border-b p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:bg-amber-300"
                          onClick={() => onEdit(u)}
                          disabled={saving}
                        >
                          Editar
                        </button>

                        <button
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                            u.activo
                              ? "bg-slate-700 hover:bg-slate-800"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                          onClick={() => onToggleActivo(u)}
                          disabled={saving}
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
                          onClick={() => onDelete(u.idusuario)}
                          disabled={saving}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {usuarios.length === 0 && (
                <tr>
                  <td className="p-5 text-center text-slate-500" colSpan={7}>
                    No hay usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}