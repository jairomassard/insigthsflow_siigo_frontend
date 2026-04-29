"use client";

import { useEffect, useState } from "react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

type Cliente = {
  idcliente: number;
  nombre: string;
  nit?: string;
  email?: string;
  activo: boolean;
  pais?: string;
  ciudad?: string;
  direccion?: string;
  telefono1?: string;
  logo_url?: string;
  limite_usuarios?: number | null;
  limite_sesiones?: number | null;
  timezone?: string;
};

type PaqueteCodigo = "operativo" | "financiero" | "completo";

const PAQUETES: {
  codigo: PaqueteCodigo;
  nombre: string;
  descripcion: string;
  permisos: number;
}[] = [
  {
    codigo: "operativo",
    nombre: "InsightFlow Operativo",
    descripcion:
      "Ventas, compras, cartera, integración Siigo y reportes operativos principales.",
    permisos: 23,
  },
  {
    codigo: "financiero",
    nombre: "InsightFlow Financiero",
    descripcion:
      "IVA, retenciones, P&L, análisis de variación, balance e indicadores financieros.",
    permisos: 11,
  },
  {
    codigo: "completo",
    nombre: "InsightFlow Completo",
    descripcion:
      "Acceso completo: operativo, financiero, dashboard ejecutivo y configuraciones avanzadas.",
    permisos: 25,
  },
];

export default function ClientsPage() {
  useAuthGuard();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<null | number>(null);

  const [form, setForm] = useState({
    nombre: "",
    nit: "",
    email: "",
    pais: "Colombia",
    ciudad: "Bogota",
    direccion: "",
    telefono1: "",
    logo_url: "",
    limite_usuarios: "3",
    limite_sesiones: "3",
    timezone: "America/Bogota",
    activo: "true",

    paquete: "operativo" as PaqueteCodigo,

    admin_nombre: "",
    admin_apellido: "",
    admin_email: "",
    admin_password: "",
  });

  const resetForm = () =>
    setForm({
      nombre: "",
      nit: "",
      email: "",
      pais: "Colombia",
      ciudad: "Bogota",
      direccion: "",
      telefono1: "",
      logo_url: "",
      limite_usuarios: "3",
      limite_sesiones: "3",
      timezone: "America/Bogota",
      activo: "true",

      paquete: "operativo",

      admin_nombre: "",
      admin_apellido: "",
      admin_email: "",
      admin_password: "",
    });

  const load = async () => {
    try {
      setErr("");
      setOk("");
      setLoading(true);
      const data = await authFetch("/clientes");
      setClientes(data);
    } catch (e: any) {
      setErr(e.message || "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clientePayloadFromForm = () => ({
    nombre: form.nombre.trim(),
    nit: form.nit.trim() || null,
    email: form.email.trim() || null,
    pais: form.pais.trim() || null,
    ciudad: form.ciudad.trim() || null,
    direccion: form.direccion.trim() || null,
    telefono1: form.telefono1.trim() || null,
    logo_url: form.logo_url.trim() || null,
    limite_usuarios: form.limite_usuarios
      ? Number(form.limite_usuarios)
      : null,
    limite_sesiones: form.limite_sesiones
      ? Number(form.limite_sesiones)
      : null,
    activo: form.activo === "true",
    timezone: form.timezone || "America/Bogota",
  });

  const registroInicialPayloadFromForm = () => ({
    cliente: clientePayloadFromForm(),
    usuario: {
      nombre: form.admin_nombre.trim(),
      apellido: form.admin_apellido.trim() || null,
      email: form.admin_email.trim(),
      password: form.admin_password,
    },
    paquetes: [form.paquete],
  });

  const validarCrearCliente = () => {
    if (!form.nombre.trim()) {
      return "Debes escribir el nombre del cliente.";
    }

    if (!form.paquete) {
      return "Debes seleccionar el paquete contratado.";
    }

    if (!form.admin_nombre.trim()) {
      return "Debes escribir el nombre del usuario administrador.";
    }

    if (!form.admin_email.trim()) {
      return "Debes escribir el email del usuario administrador.";
    }

    if (!form.admin_password.trim()) {
      return "Debes escribir una contraseña inicial para el usuario administrador.";
    }

    if (form.admin_password.trim().length < 6) {
      return "La contraseña inicial debe tener mínimo 6 caracteres.";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErr("");
    setOk("");
    setSaving(true);

    try {
      if (editingId) {
        await authFetch(`/clientes/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(clientePayloadFromForm()),
        });

        setOk("Cliente actualizado correctamente.");
      } else {
        const validation = validarCrearCliente();

        if (validation) {
          setErr(validation);
          return;
        }

        const resp = await authFetch("/clientes/registro_inicial", {
          method: "POST",
          body: JSON.stringify(registroInicialPayloadFromForm()),
        });

        const paqueteNombre =
          resp?.paquetes?.[0]?.nombre ||
          PAQUETES.find((p) => p.codigo === form.paquete)?.nombre ||
          form.paquete;

        setOk(
          `Cliente creado correctamente con paquete ${paqueteNombre}. ` +
            `Se creó el perfil Administrador, el usuario administrador y se asignaron ${resp?.permisos_asignados ?? "los"} permisos contratados.`
        );
      }

      resetForm();
      setEditingId(null);
      await load();
    } catch (e: any) {
      setErr(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (c: Cliente) => {
    setErr("");
    setOk("");
    setEditingId(c.idcliente);

    setForm({
      nombre: c.nombre || "",
      nit: c.nit || "",
      email: c.email || "",
      pais: c.pais || "",
      ciudad: c.ciudad || "",
      direccion: c.direccion || "",
      telefono1: c.telefono1 || "",
      logo_url: c.logo_url || "",
      limite_usuarios:
        typeof c.limite_usuarios === "number"
          ? String(c.limite_usuarios)
          : "",
      limite_sesiones:
        typeof c.limite_sesiones === "number"
          ? String(c.limite_sesiones)
          : "",
      activo: c.activo ? "true" : "false",
      timezone: c.timezone || "America/Bogota",

      paquete: "operativo",

      admin_nombre: "",
      admin_apellido: "",
      admin_email: "",
      admin_password: "",
    });
  };

  const onDelete = async (idcliente: number) => {
    setErr("");
    setOk("");
    setSaving(true);

    try {
      await authFetch(`/clientes/${idcliente}/full_delete?confirm=true`, {
        method: "DELETE",
      });

      setOk("Cliente eliminado completamente.");
      if (editingId === idcliente) {
        resetForm();
        setEditingId(null);
      }

      await load();
    } catch (e: any) {
      setErr(e.message || "No se pudo eliminar.");
    } finally {
      setSaving(false);
      setConfirmOpen(null);
    }
  };

  const paqueteSeleccionado = PAQUETES.find((p) => p.codigo === form.paquete);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Clientes
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Crea clientes, asigna el paquete contratado y genera el usuario
              administrador inicial con los permisos correspondientes.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">Modo SuperAdmin</div>
            <div>Creación con paquetes InsightFlow</div>
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

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-5 shadow-sm"
      >
        <div className="mb-5 flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? "Editar cliente" : "Crear cliente con paquete"}
          </h3>
          <p className="text-sm text-slate-500">
            {editingId
              ? "La edición actualiza datos básicos del cliente. El paquete no se cambia desde este formulario."
              : "La creación inicial genera cliente, paquete contratado, perfil Administrador, usuario administrador y permisos."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre cliente *
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              NIT/CC
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.nit}
              onChange={(e) => setForm({ ...form, nit: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email cliente
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              País
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.pais}
              onChange={(e) => setForm({ ...form, pais: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ciudad
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Teléfono
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.telefono1}
              onChange={(e) =>
                setForm({ ...form, telefono1: e.target.value })
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Dirección
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.direccion}
              onChange={(e) =>
                setForm({ ...form, direccion: e.target.value })
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Estado
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.value })}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Límite de usuarios
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.limite_usuarios}
              onChange={(e) =>
                setForm({ ...form, limite_usuarios: e.target.value })
              }
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Límite de sesiones
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.limite_sesiones}
              onChange={(e) =>
                setForm({ ...form, limite_sesiones: e.target.value })
              }
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Zona horaria
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.timezone}
              onChange={(e) =>
                setForm({ ...form, timezone: e.target.value })
              }
            >
              <option value="America/Bogota">
                America/Bogota (🇨🇴 Colombia)
              </option>
              <option value="America/Lima">America/Lima (🇵🇪 Perú)</option>
              <option value="America/Mexico_City">
                America/Mexico_City (🇲🇽 México)
              </option>
              <option value="America/Caracas">
                America/Caracas (🇻🇪 Venezuela)
              </option>
              <option value="America/Guatemala">
                America/Guatemala (🇬🇹 Guatemala)
              </option>
              <option value="America/La_Paz">
                America/La_Paz (🇧🇴 Bolivia)
              </option>
              <option value="America/Panama">
                America/Panama (🇵🇦 Panamá)
              </option>
              <option value="America/Asuncion">
                America/Asuncion (🇵🇾 Paraguay)
              </option>
              <option value="America/Santiago">
                America/Santiago (🇨🇱 Chile)
              </option>
              <option value="America/Buenos_Aires">
                America/Buenos_Aires (🇦🇷 Argentina)
              </option>
              <option value="America/Montevideo">
                America/Montevideo (🇺🇾 Uruguay)
              </option>
              <option value="America/New_York">
                America/New_York (🇺🇸 Este USA)
              </option>
              <option value="America/Chicago">
                America/Chicago (🇺🇸 Centro USA)
              </option>
              <option value="America/Los_Angeles">
                America/Los_Angeles (🇺🇸 Pacífico USA)
              </option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Logo URL
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="https://example.com/logo.png"
              value={form.logo_url}
              onChange={(e) =>
                setForm({ ...form, logo_url: e.target.value })
              }
            />
          </div>
        </div>

        {!editingId && (
          <>
            <div className="my-6 border-t border-slate-200" />

            <div className="mb-4">
              <h4 className="text-base font-semibold text-slate-900">
                Paquete contratado
              </h4>
              <p className="text-sm text-slate-500">
                Este paquete define las páginas y reportes disponibles para el
                cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {PAQUETES.map((p) => {
                const selected = form.paquete === p.codigo;

                return (
                  <button
                    key={p.codigo}
                    type="button"
                    onClick={() => setForm({ ...form, paquete: p.codigo })}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {p.nombre}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                          {p.permisos} permisos incluidos
                        </div>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border ${
                          selected
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300"
                        }`}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {p.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>

            {paqueteSeleccionado && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Paquete seleccionado:{" "}
                <span className="font-semibold text-slate-900">
                  {paqueteSeleccionado.nombre}
                </span>
                . Al guardar, se creará el perfil Administrador con los permisos
                contratados.
              </div>
            )}

            <div className="my-6 border-t border-slate-200" />

            <div className="mb-4">
              <h4 className="text-base font-semibold text-slate-900">
                Usuario administrador inicial
              </h4>
              <p className="text-sm text-slate-500">
                Este usuario será el primer administrador del cliente y podrá
                crear perfiles y usuarios dentro de su paquete contratado.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nombre administrador *
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={form.admin_nombre}
                  onChange={(e) =>
                    setForm({ ...form, admin_nombre: e.target.value })
                  }
                  required={!editingId}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Apellido
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={form.admin_apellido}
                  onChange={(e) =>
                    setForm({ ...form, admin_apellido: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email administrador *
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={form.admin_email}
                  onChange={(e) =>
                    setForm({ ...form, admin_email: e.target.value })
                  }
                  required={!editingId}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Contraseña inicial *
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={form.admin_password}
                  onChange={(e) =>
                    setForm({ ...form, admin_password: e.target.value })
                  }
                  required={!editingId}
                />
              </div>
            </div>
          </>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              saving
                ? "cursor-not-allowed bg-blue-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {editingId
              ? saving
                ? "Guardando..."
                : "Guardar cambios"
              : saving
                ? "Creando cliente..."
                : "Crear cliente con paquete"}
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
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500 shadow-sm">
          Cargando clientes...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="border-b p-3 text-left">ID</th>
                <th className="border-b p-3 text-left">Nombre</th>
                <th className="border-b p-3 text-left">NIT</th>
                <th className="border-b p-3 text-left">Email</th>
                <th className="border-b p-3 text-left">País</th>
                <th className="border-b p-3 text-left">Ciudad</th>
                <th className="border-b p-3 text-left">Teléfono</th>
                <th className="border-b p-3 text-left">Usuarios</th>
                <th className="border-b p-3 text-left">Sesiones</th>
                <th className="border-b p-3 text-left">Timezone</th>
                <th className="border-b p-3 text-left">Activo</th>
                <th className="border-b p-3 text-left">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {clientes.map((c) => (
                <tr key={c.idcliente} className="odd:bg-white even:bg-slate-50">
                  <td className="border-b p-3">{c.idcliente}</td>
                  <td className="border-b p-3 font-medium text-slate-900">
                    {c.nombre}
                  </td>
                  <td className="border-b p-3">{c.nit || "-"}</td>
                  <td className="border-b p-3">{c.email || "-"}</td>
                  <td className="border-b p-3">{c.pais || "-"}</td>
                  <td className="border-b p-3">{c.ciudad || "-"}</td>
                  <td className="border-b p-3">{c.telefono1 || "-"}</td>
                  <td className="border-b p-3">
                    {typeof c.limite_usuarios === "number"
                      ? c.limite_usuarios
                      : "-"}
                  </td>
                  <td className="border-b p-3">
                    {typeof c.limite_sesiones === "number"
                      ? c.limite_sesiones
                      : "-"}
                  </td>
                  <td className="border-b p-3">{c.timezone || "-"}</td>
                  <td className="border-b p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        c.activo
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="border-b p-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                        onClick={() => onEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        onClick={() => setConfirmOpen(c.idcliente)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {clientes.length === 0 && (
                <tr>
                  <td
                    className="p-5 text-center text-slate-500"
                    colSpan={12}
                  >
                    No hay clientes aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirmOpen !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Eliminar cliente
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              Esta acción eliminará el cliente y toda su información relacionada:
              usuarios, perfiles, permisos, sincronizaciones, reportes y datos
              operativos. No se puede deshacer.
            </p>

            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                onClick={() => setConfirmOpen(null)}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
                onClick={() => onDelete(confirmOpen)}
                disabled={saving}
              >
                {saving ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}