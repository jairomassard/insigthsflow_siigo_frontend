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
};

export default function ClientsPage() {
  useAuthGuard();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // modo edición
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    nit: "",
    email: "",
    pais: "",
    ciudad: "",
    direccion: "",
    telefono1: "",
    logo_url: "",
    limite_usuarios: "",
    limite_sesiones: "",
    activo: "true", // como string para el <select>
  });

  const resetForm = () =>
    setForm({
      nombre: "",
      nit: "",
      email: "",
      pais: "",
      ciudad: "",
      direccion: "",
      telefono1: "",
      logo_url: "",
      limite_usuarios: "",
      limite_sesiones: "",
      activo: "true",
    });

  const load = async () => {
    try {
      setErr("");
      setOk("");
      setLoading(true);
      const data = await authFetch("/clientes"); // SuperAdmin ve todos
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

  const payloadFromForm = () => ({
    nombre: form.nombre,
    nit: form.nit || null,
    email: form.email || null,
    pais: form.pais || null,
    ciudad: form.ciudad || null,
    direccion: form.direccion || null,
    telefono1: form.telefono1 || null,
    logo_url: form.logo_url || null,
    limite_usuarios: form.limite_usuarios ? Number(form.limite_usuarios) : null,
    limite_sesiones: form.limite_sesiones ? Number(form.limite_sesiones) : null,
    activo: form.activo === "true",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      if (editingId) {
        // Guardar edición (PUT)
        await authFetch(`/clientes/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payloadFromForm()),
        });
        setOk("Cliente actualizado correctamente.");
      } else {
        // Crear (POST)
        await authFetch("/clientes", {
          method: "POST",
          body: JSON.stringify(payloadFromForm()),
        });
        setOk("Cliente creado correctamente.");
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
        typeof c.limite_usuarios === "number" ? String(c.limite_usuarios) : "",
      limite_sesiones:
        typeof c.limite_sesiones === "number" ? String(c.limite_sesiones) : "",
      activo: c.activo ? "true" : "false",
    });
    // el botón cambiará a "Guardar"
  };

  // Modal de confirmación simple (sin librerías)
  const [confirmOpen, setConfirmOpen] = useState<null | number>(null);

  const onDelete = async (idcliente: number) => {
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await authFetch(`/clientes/${idcliente}/full_delete?confirm=true`, { method: "DELETE" });

      setOk("Cliente eliminado.");
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

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Clientes</h2>

      {/* mensajes */}
      {err && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {err}
        </div>
      )}
      {ok && (
        <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {ok}
        </div>
      )}

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-3"
      >
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
          <label className="mb-1 block text-sm text-gray-700">NIT/CC</label>
          <input
            className="w-full rounded border p-2"
            value={form.nit}
            onChange={(e) => setForm({ ...form, nit: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">País</label>
          <input
            className="w-full rounded border p-2"
            value={form.pais}
            onChange={(e) => setForm({ ...form, pais: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Ciudad</label>
          <input
            className="w-full rounded border p-2"
            value={form.ciudad}
            onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-gray-700">Dirección</label>
          <input
            className="w-full rounded border p-2"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Teléfono 1</label>
          <input
            className="w-full rounded border p-2"
            value={form.telefono1}
            onChange={(e) => setForm({ ...form, telefono1: e.target.value })}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-gray-700">Logo (URL)</label>
          <input
            className="w-full rounded border p-2"
            placeholder="https://example.com/logo.png"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">Estado</label>
          <select
            className="w-full rounded border p-2"
            value={form.activo}
            onChange={(e) => setForm({ ...form, activo: e.target.value })}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">
            Límite de usuarios
          </label>
          <input
            className="w-full rounded border p-2"
            value={form.limite_usuarios}
            onChange={(e) =>
              setForm({ ...form, limite_usuarios: e.target.value })
            }
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-700">
            Límite de sesiones
          </label>
          <input
            className="w-full rounded border p-2"
            value={form.limite_sesiones}
            onChange={(e) =>
              setForm({ ...form, limite_sesiones: e.target.value })
            }
            inputMode="numeric"
          />
        </div>

        <div className="md:col-span-3 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className={`rounded px-4 py-2 text-white ${
              saving
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {editingId ? (saving ? "Guardando..." : "Guardar") : saving ? "Creando..." : "Crear cliente"}
          </button>

          {editingId && (
            <button
              type="button"
              className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
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

      {/* Tabla */}
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border">
            <thead className="bg-gray-50">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">NIT</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">País</th>
                <th className="border p-2">Ciudad</th>
                <th className="border p-2">Teléfono</th>
                <th className="border p-2">Lím. usuarios</th>
                <th className="border p-2">Lím. sesiones</th>
                <th className="border p-2">Activo</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.idcliente} className="odd:bg-white even:bg-gray-50">
                  <td className="border p-2">{c.idcliente}</td>
                  <td className="border p-2">{c.nombre}</td>
                  <td className="border p-2">{c.nit || "-"}</td>
                  <td className="border p-2">{c.email || "-"}</td>
                  <td className="border p-2">{c.pais || "-"}</td>
                  <td className="border p-2">{c.ciudad || "-"}</td>
                  <td className="border p-2">{c.telefono1 || "-"}</td>
                  <td className="border p-2">
                    {typeof c.limite_usuarios === "number"
                      ? c.limite_usuarios
                      : "-"}
                  </td>
                  <td className="border p-2">
                    {typeof c.limite_sesiones === "number"
                      ? c.limite_sesiones
                      : "-"}
                  </td>
                  <td className="border p-2">{c.activo ? "Sí" : "No"}</td>
                  <td className="border p-2">
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
                        onClick={() => onEdit(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
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
                  <td className="p-3 text-center text-gray-500" colSpan={11}>
                    No hay clientes aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmOpen !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Eliminar cliente</h3>
            <p className="mb-4 text-sm text-gray-600">
              ¿Seguro que deseas eliminar este cliente? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
                onClick={() => setConfirmOpen(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                onClick={() => onDelete(confirmOpen!)}
                disabled={saving}
              >
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
