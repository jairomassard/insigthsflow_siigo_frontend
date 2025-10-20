"use client";

import { useState } from "react";
import { authFetch } from "@/lib/api";

export default function CargarDocumentosSoporte() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<string>("");

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setArchivo(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!archivo) {
      setEstado("Selecciona un archivo primero.");
      return;
    }

    setEstado("Cargando…");
    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
      const res = await authFetch("/importar/soporte-excel", {
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
      <h3 className="text-lg font-medium">Carga de Documentos Soporte desde Excel</h3>
      <p className="text-sm text-gray-600">
        Carga aqui tu archivo exportado desde Siigo con los documentos soporte{" "}
      </p>
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
        Subir archivo de soporte
      </button>
      {estado && <p className="text-sm text-blue-800">{estado}</p>}
    </div>
  );
}
