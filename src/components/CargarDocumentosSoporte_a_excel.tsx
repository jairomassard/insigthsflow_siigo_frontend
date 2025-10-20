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
        const response = await fetch("http://127.0.0.1:5000/importar/soporte-excel-preview", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: formData,
        });

        if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "preview_siigo_compras.zip");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setEstado("Archivo de vista previa generado y descargado ✅");
    } catch (e: any) {
        setEstado("Error: " + e.message);
    }
    };


  return (
    <div className="border p-4 rounded space-y-3">
      <h3 className="text-lg font-medium">Carga de Documentos Soporte desde Excel</h3>
      <p className="text-sm text-gray-600">
        Exporta el reporte desde{" "}
        <b>Reportes → Compras y Gastos → Movimiento Factura de compra</b>, seleccionando{" "}
        <b>Tipo de Transacción: Documento Soporte</b> y el rango de fechas del mes deseado. Luego sube aquí el archivo.
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
