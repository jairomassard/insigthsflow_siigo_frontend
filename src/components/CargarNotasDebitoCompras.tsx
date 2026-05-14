"use client";

import { useMemo, useState } from "react";
import { API, getToken } from "@/lib/api";

export default function CargarNotasDebitoCompras() {
  const ahora = new Date();

  const [archivo, setArchivo] = useState<File | null>(null);
  const [mes, setMes] = useState(String(ahora.getMonth() + 1).padStart(2, "0"));
  const [anio, setAnio] = useState(String(ahora.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"info" | "success" | "error">("info");
  const [resultado, setResultado] = useState<any>(null);

  const meses = useMemo(
    () => [
      { value: "01", label: "Enero" },
      { value: "02", label: "Febrero" },
      { value: "03", label: "Marzo" },
      { value: "04", label: "Abril" },
      { value: "05", label: "Mayo" },
      { value: "06", label: "Junio" },
      { value: "07", label: "Julio" },
      { value: "08", label: "Agosto" },
      { value: "09", label: "Septiembre" },
      { value: "10", label: "Octubre" },
      { value: "11", label: "Noviembre" },
      { value: "12", label: "Diciembre" },
    ],
    []
  );

  const cargar = async () => {
    setMensaje("");
    setResultado(null);
    setTipoMensaje("info");

    if (!archivo) {
      setTipoMensaje("error");
      setMensaje("Selecciona el archivo Excel de notas débito exportado desde Siigo.");
      return;
    }

    if (!mes || !anio) {
      setTipoMensaje("error");
      setMensaje("Selecciona el mes y año del reporte.");
      return;
    }

    const token = getToken();

    if (!token) {
      setTipoMensaje("error");
      setMensaje("No se encontró token de autenticación. Vuelve a iniciar sesión.");
      return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("mes", mes);
    formData.append("anio", anio);

    setLoading(true);

    try {
      const res = await fetch(`${API}/importar/notas-debito-compras-excel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.detalle || `HTTP ${res.status}`);
      }

      setResultado(data);
      setTipoMensaje("success");
      setMensaje(
        `Carga finalizada. Insertados: ${data?.registros_insertados ?? 0}, actualizados: ${
          data?.registros_actualizados ?? 0
        }, errores: ${data?.total_errores ?? 0}.`
      );
    } catch (error: any) {
      setTipoMensaje("error");
      setMensaje(error.message || "Error cargando el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const estilosMensaje = {
    info: "border-blue-100 bg-blue-50 text-blue-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    error: "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
        <strong>Uso:</strong> exporta desde Siigo el reporte mensual de movimiento de notas
        débito de compras. El archivo debe conservar los encabezados en la fila 8. El cargue es
        incremental: si la nota ya existe, se actualiza; si no existe, se crea.
      </div>

      <div className="grid gap-3 md:grid-cols-[160px_160px_1fr]">
        <label className="flex flex-col text-sm font-medium text-slate-700">
          Mes
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-1 rounded-xl border border-slate-300 bg-white p-2 text-sm outline-none focus:border-blue-500"
          >
            {meses.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-sm font-medium text-slate-700">
          Año
          <input
            type="number"
            min={2020}
            max={2100}
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="mt-1 rounded-xl border border-slate-300 p-2 text-sm outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col text-sm font-medium text-slate-700">
          Archivo Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="mt-1 rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Cargando notas débito…" : "Cargar notas débito"}
        </button>

        <p className="text-xs leading-5 text-slate-500">
          Relaciona cada nota contra compras usando la columna <strong>Comprobante relacionado</strong>.
        </p>
      </div>

      {mensaje && (
        <div className={`rounded-xl border p-3 text-sm ${estilosMensaje[tipoMensaje]}`}>
          {mensaje}
        </div>
      )}

      {resultado && (
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Ver detalle técnico del cargue
          </summary>

          <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}