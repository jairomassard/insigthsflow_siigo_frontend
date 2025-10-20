"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";

export default function CargarNomina() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mes, setMes] = useState<string>("");
  const [anio, setAnio] = useState<string>(new Date().getFullYear().toString());
  const [estado, setEstado] = useState<string>("");

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setArchivo(e.target.files[0]);
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

      <button
        onClick={handleUpload}
        className="rounded bg-cyan-700 hover:bg-cyan-800 text-white px-4 py-2"
      >
        Subir archivo de nómina
      </button>

      {estado && <p className="text-sm text-blue-800">{estado}</p>}
    </div>
  );
}
