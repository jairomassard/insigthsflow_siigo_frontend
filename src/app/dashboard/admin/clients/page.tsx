"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Mail, Building2 } from "lucide-react";
import useAuthGuard from "@/hooks/useAuthGuard";
import { authFetch } from "@/lib/api";

type PaqueteCodigo = "operativo" | "financiero" | "completo";

type PaqueteActual = {
  idcliente_paquete?: number | null;
  idpaquete?: number;
  codigo?: PaqueteCodigo | string;
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
};

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

  // Nuevos campos esperados desde GET /clientes
  paquete_codigo?: PaqueteCodigo | string | null;
  paquete_nombre?: string | null;
  idpaquete?: number | null;
  paquete_actual?: PaqueteActual | null;
};

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

const isValidEmail = (email: string) => {
  const clean = email.trim();
  if (!clean) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
};

const normalizarPaqueteCodigo = (value?: string | null): PaqueteCodigo => {
  const codigo = String(value || "").trim().toLowerCase();

  if (codigo === "financiero") return "financiero";
  if (codigo === "completo") return "completo";
  return "operativo";
};

export default function ClientsPage() {
  useAuthGuard();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packageSaving, setPackageSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      setClientes(data || []);
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

    if (form.email.trim() && !isValidEmail(form.email)) {
      return "El correo electrónico del cliente no tiene un formato válido.";
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

    if (!isValidEmail(form.admin_email)) {
      return "El email del usuario administrador no tiene un formato válido.";
    }

    if (!form.admin_password.trim()) {
      return "Debes escribir una contraseña inicial para el usuario administrador.";
    }

    if (form.admin_password.trim().length < 6) {
      return "La contraseña inicial debe tener mínimo 6 caracteres.";
    }

    return "";
  };

  const validarEditarCliente = () => {
    if (!form.nombre.trim()) {
      return "Debes escribir el nombre del cliente.";
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      return "El correo electrónico del cliente no tiene un formato válido.";
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
        const validation = validarEditarCliente();

        if (validation) {
          setErr(validation);
          return;
        }

        await authFetch(`/clientes/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(clientePayloadFromForm()),
        });

        setOk(
          "Cliente actualizado correctamente. Si también cambiaste el paquete, presiona el botón específico de cambio de paquete."
        );
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
            `Se creó el perfil Administrador, el usuario administrador y se asignaron ${
              resp?.permisos_asignados ?? "los"
            } permisos contratados.`
        );

        resetForm();
        setEditingId(null);
      }

      await load();
    } catch (e: any) {
      setErr(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const cambiarPaqueteCliente = async () => {
    if (!editingId) return;

    setErr("");
    setOk("");
    setPackageSaving(true);

    try {
      const paqueteActualCodigo = normalizarPaqueteCodigo(
        clienteEditando?.paquete_codigo ||
          clienteEditando?.paquete_actual?.codigo ||
          null
      );

      if (paqueteActualCodigo === form.paquete) {
        setOk("El cliente ya tiene seleccionado ese paquete.");
        return;
      }

      const paqueteNuevo = PAQUETES.find((p) => p.codigo === form.paquete);

      const resp = await authFetch(`/clientes/${editingId}/paquete`, {
        method: "PUT",
        body: JSON.stringify({
          paquete: form.paquete,
        }),
      });

      const nombreNuevo =
        resp?.paquete_nuevo?.nombre ||
        paqueteNuevo?.nombre ||
        form.paquete;

      const permisos = resp?.permisos;
      const totalPermisos =
        permisos?.permisos_cliente?.total_sincronizados ??
        permisos?.codigos_permitidos?.length ??
        "los";

      setOk(
        `Paquete actualizado correctamente a ${nombreNuevo}. ` +
          `Se sincronizaron ${totalPermisos} permisos del paquete y se asignaron al perfil Administrador.`
      );

      await load();
    } catch (e: any) {
      setErr(e.message || "No se pudo cambiar el paquete del cliente.");
    } finally {
      setPackageSaving(false);
    }
  };

  const onEdit = (c: Cliente) => {
    setErr("");
    setOk("");
    setEditingId(c.idcliente);

    const paqueteActual = normalizarPaqueteCodigo(
      c.paquete_codigo || c.paquete_actual?.codigo || null
    );

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

      paquete: paqueteActual,

      admin_nombre: "",
      admin_apellido: "",
      admin_email: "",
      admin_password: "",
    });

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
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

  const clienteEditando = editingId
    ? clientes.find((c) => c.idcliente === editingId)
    : null;

  const paqueteActualEditandoCodigo = normalizarPaqueteCodigo(
    clienteEditando?.paquete_codigo ||
      clienteEditando?.paquete_actual?.codigo ||
      null
  );

  const paqueteActualEditando =
    PAQUETES.find((p) => p.codigo === paqueteActualEditandoCodigo) || null;

  const paqueteCambioPendiente =
    !!editingId && paqueteActualEditandoCodigo !== form.paquete;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Crea clientes, asigna el paquete contratado y genera el usuario
              administrador inicial con los permisos correspondientes.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold">Modo SuperAdmin</div>
            <div>Creación y administración de paquetes InsightFlow</div>
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
              ? "La edición actualiza los datos básicos del cliente. El cambio de paquete se hace con un botón separado para evitar modificaciones accidentales."
              : "La creación inicial genera cliente, paquete contratado, perfil Administrador, usuario administrador y permisos."}
          </p>
        </div>

        {editingId && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2 text-blue-700 shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <div className="text-sm font-semibold text-blue-950">
                    Editando cliente #{editingId}
                  </div>
                  <div className="text-sm text-blue-800">
                    {clienteEditando?.nombre ||
                      form.nombre ||
                      "Cliente seleccionado"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:items-end">
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Correo actual:</span>
                  <span>
                    {clienteEditando?.email ||
                      form.email ||
                      "Sin correo registrado"}
                  </span>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  <span className="font-medium">Paquete actual: </span>
                  <span>
                    {clienteEditando?.paquete_nombre ||
                      clienteEditando?.paquete_actual?.nombre ||
                      paqueteActualEditando?.nombre ||
                      "Sin paquete identificado"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="text-base font-semibold text-slate-900">
            Datos del cliente / empresa
          </h4>
          <p className="text-sm text-slate-500">
            Estos datos pertenecen a la empresa cliente. El correo de esta
            sección es diferente al correo del usuario administrador.
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
              Correo electrónico del cliente / empresa
            </label>
            <input
              type="email"
              placeholder="contacto@empresa.com"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">
              Correo corporativo o comercial del cliente. No corresponde
              necesariamente al usuario administrador.
            </p>
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

        <div className="my-6 border-t border-slate-200" />

        <div className="mb-4">
          <h4 className="text-base font-semibold text-slate-900">
            Paquete contratado
          </h4>
          <p className="text-sm text-slate-500">
            {editingId
              ? "Selecciona un nuevo paquete y presiona “Cambiar paquete y actualizar permisos”. Este cambio no se aplica al guardar datos básicos."
              : "Este paquete define las páginas y reportes disponibles para el cliente."}
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
                <p className="mt-3 text-sm text-slate-600">{p.descripcion}</p>
              </button>
            );
          })}
        </div>

        {paqueteSeleccionado && (
          <div
            className={`mt-3 rounded-xl p-3 text-sm ${
              editingId && paqueteCambioPendiente
                ? "border border-amber-200 bg-amber-50 text-amber-800"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {editingId ? (
              <>
                Paquete actual:{" "}
                <span className="font-semibold text-slate-900">
                  {clienteEditando?.paquete_nombre ||
                    clienteEditando?.paquete_actual?.nombre ||
                    paqueteActualEditando?.nombre ||
                    "Sin paquete identificado"}
                </span>
                . Paquete seleccionado:{" "}
                <span className="font-semibold text-slate-900">
                  {paqueteSeleccionado.nombre}
                </span>
                .
                {paqueteCambioPendiente ? (
                  <span>
                    {" "}
                    Hay un cambio pendiente. Presiona el botón de cambio de
                    paquete para aplicarlo.
                  </span>
                ) : (
                  <span> No hay cambio de paquete pendiente.</span>
                )}
              </>
            ) : (
              <>
                Paquete seleccionado:{" "}
                <span className="font-semibold text-slate-900">
                  {paqueteSeleccionado.nombre}
                </span>
                . Al guardar, se creará el perfil Administrador con los permisos
                contratados.
              </>
            )}
          </div>
        )}

        {editingId && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Cambio de paquete y permisos
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Este proceso actualiza el paquete base contratado, sincroniza
                permisos del nuevo paquete y los asigna al perfil Administrador.
                No borra permisos antiguos de forma automática.
              </p>
            </div>

            <button
              type="button"
              onClick={cambiarPaqueteCliente}
              disabled={packageSaving || !paqueteCambioPendiente}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                packageSaving || !paqueteCambioPendiente
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-purple-700 hover:bg-purple-800"
              }`}
            >
              {packageSaving
                ? "Actualizando paquete..."
                : "Cambiar paquete y actualizar permisos"}
            </button>
          </div>
        )}

        {!editingId && (
          <>
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

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-slate-300 p-2.5 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={form.admin_password}
                    onChange={(e) =>
                      setForm({ ...form, admin_password: e.target.value })
                    }
                    required={!editingId}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    title={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
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
                : "Guardar cambios básicos"
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
          <table className="w-full min-w-[1250px] text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="border-b p-3 text-left">ID</th>
                <th className="border-b p-3 text-left">Nombre</th>
                <th className="border-b p-3 text-left">NIT</th>
                <th className="border-b p-3 text-left">Correo cliente</th>
                <th className="border-b p-3 text-left">Paquete</th>
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
              {clientes.map((c) => {
                const paqueteCodigoRaw =
                  c.paquete_codigo || c.paquete_actual?.codigo || null;

                const paqueteCodigo = paqueteCodigoRaw
                  ? normalizarPaqueteCodigo(paqueteCodigoRaw)
                  : null;

                const paqueteTabla = paqueteCodigo
                  ? PAQUETES.find((p) => p.codigo === paqueteCodigo) || null
                  : null;

                return (
                  <tr key={c.idcliente} className="odd:bg-white even:bg-slate-50">
                    <td className="border-b p-3">{c.idcliente}</td>
                    <td className="border-b p-3 font-medium text-slate-900">
                      {c.nombre}
                    </td>
                    <td className="border-b p-3">{c.nit || "-"}</td>
                    <td className="border-b p-3">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {c.email}
                        </a>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                          Sin correo registrado
                        </span>
                      )}
                    </td>
                    <td className="border-b p-3">
                      {c.paquete_nombre || c.paquete_actual?.nombre || paqueteTabla?.nombre ? (
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                          {c.paquete_nombre ||
                            c.paquete_actual?.nombre ||
                            paqueteTabla?.nombre}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Sin paquete
                        </span>
                      )}
                    </td>
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
                );
              })}

              {clientes.length === 0 && (
                <tr>
                  <td className="p-5 text-center text-slate-500" colSpan={13}>
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