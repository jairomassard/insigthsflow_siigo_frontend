"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";

type Permiso = {
  idpermiso: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  permitido: boolean;
};

interface Props {
  perfilId: number | null;
  perfilNombre?: string;
  onClose: () => void;
}

export default function PermisosModal({ perfilId, perfilNombre, onClose }: Props) {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!perfilId) return;
    const load = async () => {
      try {
        setError(""); setLoading(true);
        const data = await authFetch(`/api/perfiles/${perfilId}/permisos`);
        setPermisos(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [perfilId]);

  const toggle = (idpermiso: number) => {
    setPermisos((prev) =>
      prev.map((p) => (p.idpermiso === idpermiso ? { ...p, permitido: !p.permitido } : p))
    );
  };

  const save = async () => {
    if (!perfilId) return;
    setSaving(true); setError(""); setOk("");
    try {
      const body = {
        permisos: permisos.map((p) => ({
          idpermiso: p.idpermiso,
          codigo: p.codigo,          // 👈 NUEVO
          nombre: p.nombre,          // 👈 NUEVO
          descripcion: p.descripcion,// 👈 NUEVO
          permitido: p.permitido,
        })),
      };
      await authFetch(`/api/perfiles/${perfilId}/permisos`, {
        method: "PUT",               // 👈 Usa PUT, no POST
        body: JSON.stringify(body),
      });
      setOk("Permisos actualizados correctamente.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };


  if (!perfilId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded bg-white p-5 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">
          Permisos para el perfil: <span className="text-blue-600">{perfilNombre}</span>
        </h3>

        {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        {ok && <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">{ok}</div>}

        {loading ? (
          <p>Cargando permisos…</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full border">
              <thead className="bg-gray-50 text-sm">
                <tr>
                  <th className="border p-2">Permiso</th>
                  <th className="border p-2">Descripción</th>
                  <th className="border p-2 text-center">Permitido</th>
                </tr>
              </thead>
              <tbody>
                {permisos.map((p) => (
                  <tr key={p.idpermiso} className="odd:bg-white even:bg-gray-50">
                    <td className="border p-2 font-medium">{p.nombre}</td>
                    <td className="border p-2 text-sm">{p.descripcion || "-"}</td>
                    <td className="border p-2 text-center">
                      <input
                        type="checkbox"
                        checked={p.permitido}
                        onChange={() => toggle(p.idpermiso)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Cerrar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className={`rounded px-4 py-2 text-white ${
              saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
