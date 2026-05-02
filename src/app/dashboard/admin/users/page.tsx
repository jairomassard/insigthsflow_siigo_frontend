"use client";

import { useEffect, useMemo, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

type Cliente = {
  idcliente: number;
  nombre: string;
  limite_usuarios?: number | null;
};

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
    setForm({
      idcliente: "",
      idperfil: "",
      nombre: "",
      apellido: "",
      email: "",
      password: "",
    });

  const loadAll = async () => {
    try {
      setLoading(true);
      setErr("");
      setOk("");

      const [cls, pfs, us] = await Promise.all([
        authFetch("/clientes"),
        authFetch("/admin/perfiles"),
        authFetch("/admin/usuarios"),
      ]);

      setClientes(cls);
      setPerfiles(pfs);
      setUsuarios(us);
    } catch (e: any) {
      setErr(e.message || "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const perfilesFiltrados = useMemo(() => {
    const cid = Number(form.idcliente);
    return perfiles.filter((p) => p.idcliente === cid);
  }, [perfiles, form.idcliente]);

  const resumenPorCliente = useMemo(() => {
    return clientes.map((cliente) => {
      const usuariosCliente = usuarios.filter(
        (u) => u.idcliente === cliente.idcliente
      );

      const activos = usuariosCliente.filter((u) => u.activo).length;
      const inactivos = usuariosCliente.filter((u) => !u.activo).length;
      const limite = cliente.limite_usuarios ?? null;

      const cuposDisponibles =
        typeof limite === "number" && limite > 0
          ? Math.max(limite - activos, 0)
          : null;

      return {
        idcliente: cliente.idcliente,
        nombre: cliente.nombre,
        activos,
        inactivos,
        total: usuariosCliente.length,
        limite,
        cuposDisponibles,
      };
    });
  }, [clientes, usuarios]);

  const clienteSeleccionado = useMemo(() => {
    if (!form.idcliente) return null;
    return clientes.find((c) => c.idcliente === Number(form.idcliente)) || null;
  }, [clientes, form.idcliente]);

  const usuariosActivosClienteSeleccionado = useMemo(() => {
    if (!form.idcliente) return 0;
    return usuarios.filter(
      (u) => u.idcliente === Number(form.idcliente) && u.activo
    ).length;
  }, [usuarios, form.idcliente]);

  const cuposClienteSeleccionado = useMemo(() => {
    const limite = clienteSeleccionado?.limite_usuarios;

    if (typeof limite !== "number" || limite <= 0) {
      return null;
    }

    if (editingId) {
      return Math.max(limite - usuariosActivosClienteSeleccionado, 0);
    }

    return Math.max(limite - usuariosActivosClienteSeleccionado, 0);
  }, [clienteSeleccionado, usuariosActivosClienteSeleccionado, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setErr("");
    setOk("");

    try {
      const payload: any = {
        idcliente: Number(form.idcliente),
        idperfil: Number(form.idperfil),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || null,
        email: form.email.trim().toLowerCase(),
      };

      if (editingId) {
        if (form.password.trim()) {
          payload.password = form.password;
        }

        await authFetch(`/admin/usuarios/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setOk("Usuario actualizado correctamente.");
      } else {
        payload.password = form.password;

        await authFetch("/admin/usuarios", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setOk("Usuario creado correctamente.");
      }

      resetForm();
      setEditingId(null);
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Error al guardar usuario.");
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
      await authFetch(`/admin/usuarios/${id}`, { method: "DELETE" });

      setOk("Usuario eliminado correctamente.");

      if (editingId === id) {
        resetForm();
        setEditingId(null);
      }

      await loadAll();
    } catch (e: any) {
      setErr(e.message || "No se pudo eliminar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActivo = async (u: Usuario) => {
    const nuevoEstado = !u.activo;

    const mensaje = nuevoEstado
      ? "¿Activar este usuario? Si el cliente ya alcanzó su límite contratado, el sistema no lo permitirá."
      : "¿Desactivar este usuario? Al desactivarlo liberará un cupo para crear otro usuario.";

    if (!confirm(mensaje)) return;

    setSaving(true);
    setErr("");
    setOk("");

    try {
      await authFetch(`/admin/usuarios/${u.idusuario}`, {
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

      await loadAll();
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
            <h2 className="text-2xl font-bold text-slate-900">
              Usuarios por cliente
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Administra usuarios de todos los clientes. El límite de usuarios
              activos se controla desde backend según el contrato de cada
              cliente.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">SuperAdmin</div>
            <div>Gestión global de usuarios</div>
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
        {resumenPorCliente.map((r) => {
          const sinLimite =
            typeof r.limite !== "number" || r.limite <= 0;

          const lleno =
            !sinLimite &&
            typeof r.limite === "number" &&
            r.activos >= r.limite;

          return (
            <div
              key={r.idcliente}
              className="rounded-2xl border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {r.nombre}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Cliente #{r.idcliente}
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    lleno
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {lleno ? "Límite alcanzado" : "Con cupo"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2">
                  <div className="text-lg font-bold text-slate-900">
                    {r.activos}
                  </div>
                  <div className="text-xs text-slate-500">Activos</div>
                </div>

                <div className="rounded-xl bg-slate-50 p-2">
                  <div className="text-lg font-bold text-slate-900">
                    {sinLimite ? "∞" : r.limite}
                  </div>
                  <div className="text-xs text-slate-500">Límite</div>
                </div>

                <div className="rounded-xl bg-slate-50 p-2">
                  <div className="text-lg font-bold text-slate-900">
                    {sinLimite ? "∞" : r.cuposDisponibles}
                  </div>
                  <div className="text-xs text-slate-500">Cupos</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Inactivos: {r.inactivos} · Total registrados: {r.total}
              </div>
            </div>
          );
        })}
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
            Al crear un usuario, el backend valida que el cliente no supere su
            límite de usuarios activos.
          </p>
        </div>

        {clienteSeleccionado && (
          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <span className="font-semibold">
              Cliente seleccionado: {clienteSeleccionado.nombre}.
            </span>{" "}
            Usuarios activos: {usuariosActivosClienteSeleccionado}
            {typeof clienteSeleccionado.limite_usuarios === "number" &&
            clienteSeleccionado.limite_usuarios > 0 ? (
              <>
                {" "}
                / {clienteSeleccionado.limite_usuarios}. Cupos disponibles:{" "}
                {cuposClienteSeleccionado}.
              </>
            ) : (
              <>. Sin límite configurado.</>
            )}
          </div>
        )}

        <div className="grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cliente *
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.idcliente}
              onChange={(e) =>
                setForm({
                  ...form,
                  idcliente: e.target.value,
                  idperfil: "",
                })
              }
              required
            >
              <option value="">Seleccione…</option>
              {clientes.map((c) => (
                <option key={c.idcliente} value={c.idcliente}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Perfil *
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              value={form.idperfil}
              onChange={(e) =>
                setForm({ ...form, idperfil: e.target.value })
              }
              required
              disabled={!form.idcliente}
            >
              <option value="">
                {form.idcliente
                  ? "Seleccione…"
                  : "Seleccione un cliente primero"}
              </option>
              {perfilesFiltrados.map((p) => (
                <option key={p.idperfil} value={p.idperfil}>
                  {p.nombre}
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
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="border-b p-3 text-left">ID</th>
                <th className="border-b p-3 text-left">Cliente</th>
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
                const cli = clientes.find(
                  (c) => c.idcliente === u.idcliente
                );
                const pf = perfiles.find(
                  (p) => p.idperfil === u.idperfil
                );

                return (
                  <tr
                    key={u.idusuario}
                    className="odd:bg-white even:bg-slate-50"
                  >
                    <td className="border-b p-3">{u.idusuario}</td>
                    <td className="border-b p-3">
                      {cli?.nombre || u.idcliente || "-"}
                    </td>
                    <td className="border-b p-3">
                      {pf?.nombre || u.idperfil || "-"}
                    </td>
                    <td className="border-b p-3 font-medium text-slate-900">
                      {u.nombre}
                    </td>
                    <td className="border-b p-3">
                      {u.apellido || "-"}
                    </td>
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
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                          onClick={() => onEdit(u)}
                          disabled={saving}
                        >
                          Editar
                        </button>

                        <button
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
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
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
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
                  <td
                    className="p-5 text-center text-slate-500"
                    colSpan={8}
                  >
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