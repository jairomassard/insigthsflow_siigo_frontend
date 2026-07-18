"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";

const ETIQUETAS_CAMPO: Record<string, string> = {
  nombre: "Nombre",
  identificacion: "Identificación",
  no_contrato: "No contrato",
  sueldo: "Sueldo",
  aux_transporte: "Auxilio transporte/conectividad",
  auxilio_extralegal: "Auxilio extralegal",
  prima: "Prima",
  intereses_cesantias: "Intereses cesantías",
  total_ingresos: "Total ingresos",
  fondo_salud: "Fondo de salud",
  fondo_pension: "Fondo de pensión",
  fondo_solidaridad: "Fondo de solidaridad",
  retefuente: "Retefuente",
  prestamos: "Préstamos",
  total_deducciones: "Total deducciones",
  neto_pagar: "Neto a pagar",
};

type ValidacionNomina = {
  mensaje?: string;
  error?: string;
  columnas_mapeadas?: Record<string, string>;
  campos_obligatorios_faltantes?: string[];
  campos_opcionales_detectados?: string[];
  campos_opcionales_no_detectados?: string[];
  listo_para_cargar?: boolean;
};

export default function CargarNomina() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mes, setMes] = useState<string>("");
  const [anio, setAnio] = useState<string>(new Date().getFullYear().toString());
  const [estado, setEstado] = useState<string>("");
  const [validando, setValidando] = useState(false);
  const [validacion, setValidacion] = useState<ValidacionNomina | null>(null);

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setArchivo(e.target.files[0]);
      setValidacion(null);
      setEstado("");
    }
  };

  const handlePrevisualizar = async () => {
    if (!archivo) {
      setEstado("Selecciona primero el archivo.");
      return;
    }

    setValidando(true);
    setEstado("");
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const res: ValidacionNomina = await authFetch("/validar/nomina-excel", {
        method: "POST",
        body: formData,
      });
      setValidacion(res);
      if (res?.error) setEstado("Error: " + res.error);
    } catch (e: any) {
      setEstado("Error: " + e.message);
    } finally {
      setValidando(false);
    }
  };

  const handleUpload = async () => {
    if (!archivo || !mes || !anio) {
      setEstado("Debes seleccionar mes, año y archivo.");
      return;
    }

    setEstado("Cargando…");
    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("mes", mes);
    formData.append("anio", anio);

    try {
      const res = await authFetch("/importar/nomina-excel", {
        method: "POST",
        body: formData,
      });

      if (res?.mensaje) {
        setEstado(res.mensaje);
      } else if (res?.error) {
        setEstado("Error: " + res.error);
      } else {
        setEstado("Respuesta inesperada.");
      }
    } catch (e: any) {
      setEstado("Error: " + e.message);
    }
  };

  return (
    <div className="border p-4 rounded space-y-3">
      <h3 className="text-lg font-medium">Carga de Nómina desde Excel</h3>
      <p className="text-sm text-gray-600">
        Selecciona el mes, año y archivo exportado desde tu sistema de nómina.
      </p>

      <a
        href="/plantillas/Plantilla_Nomina_InsightFlow.xlsx"
        download
        className="inline-block text-sm font-semibold text-cyan-700 underline hover:text-cyan-900"
      >
        Descargar plantilla de referencia
      </a>

      <div className="flex gap-2">
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border rounded p-2"
        >
          <option value="">Mes</option>
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>

        <input
          type="number"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          className="border rounded p-2 w-24"
          placeholder="Año"
        />
      </div>

      <input
        type="file"
        accept=".xls,.xlsx"
        onChange={handleArchivoChange}
        className="block"
      />

      <div className="flex gap-2">
        <button
          onClick={handlePrevisualizar}
          disabled={!archivo || validando}
          className="rounded border border-cyan-700 text-cyan-700 hover:bg-cyan-50 px-4 py-2 disabled:opacity-50"
        >
          {validando ? "Revisando…" : "Previsualizar archivo"}
        </button>

        <button
          onClick={handleUpload}
          className="rounded bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-2"
        >
          Subir archivo de nómina
        </button>
      </div>

      {validacion && !validacion.error && (
        <div
          className={`rounded-lg border p-3 text-sm space-y-2 ${
            validacion.listo_para_cargar
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-semibold">
            {validacion.listo_para_cargar
              ? "El archivo trae todos los campos obligatorios — listo para subir."
              : "Faltan campos obligatorios, este archivo no se podrá cargar así:"}
          </p>

          {!validacion.listo_para_cargar && (
            <ul className="list-disc list-inside">
              {(validacion.campos_obligatorios_faltantes || []).map((campo) => (
                <li key={campo}>{ETIQUETAS_CAMPO[campo] || campo}</li>
              ))}
            </ul>
          )}

          {(validacion.campos_opcionales_no_detectados || []).length > 0 && (
            <p className="text-xs text-slate-600">
              Campos opcionales que no se detectaron (quedarán en cero):{" "}
              {(validacion.campos_opcionales_no_detectados || [])
                .map((campo) => ETIQUETAS_CAMPO[campo] || campo)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {estado && <p className="text-sm text-blue-800">{estado}</p>}
    </div>
  );
}
