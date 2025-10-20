"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// === Tipos ===
interface ResumenFinanciero {
  clase: string;
  valor: number;
  interpretacion: string;
}

// === Función de color semáforo ===
function getIndicatorColor(key: string, value: number | null): string {
  if (value === null || isNaN(Number(value))) return "bg-gray-100";
  switch (key) {
    case "liquidez":
      if (value < 1) return "bg-red-200";
      if (value < 2) return "bg-yellow-100";
      return "bg-green-100";
    case "apalancamiento":
      if (value > 0.8) return "bg-red-200";
      if (value > 0.6) return "bg-yellow-100";
      return "bg-green-100";
    case "rentabilidad":
      if (value < 0) return "bg-red-200";
      if (value < 0.1) return "bg-yellow-100";
      return "bg-green-100";
    case "autonomia":
      if (value < 0.3) return "bg-red-200";
      if (value < 0.5) return "bg-yellow-100";
      return "bg-green-100";
    case "solvencia":
    case "cobertura_activo_pasivo":
      if (value < 1) return "bg-red-200";
      if (value < 1.5) return "bg-yellow-100";
      return "bg-green-100";
    case "capital_trabajo":
      return value < 0 ? "bg-red-200" : "bg-green-100";
    default:
      return "bg-gray-100";
  }
}

export default function IndicadoresFinancierosPage() {
  const [anio, setAnio] = useState<number>(2025);
  const [mesInicio, setMesInicio] = useState<number>(1);
  const [mesFin, setMesFin] = useState<number>(12);
  const [resumen, setResumen] = useState<ResumenFinanciero[]>([]);
  const [indicadores, setIndicadores] = useState<Record<string, number | null>>({});
  const [interpretaciones, setInterpretaciones] = useState<Record<string, string>>({});
  const [conclusiones, setConclusiones] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // === Cargar datos ===
  const cargarIndicadores = async () => {
    setLoading(true);
    try {
      const data = await authFetch(
        `/reportes/indicadores/financieros?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
      );
      setResumen(data.resumen_financiero || []);
      setIndicadores(data.indicadores || {});
      setInterpretaciones(data.interpretaciones || {});
      setConclusiones(data.conclusiones || []);
    } catch (err) {
      console.error("Error al cargar indicadores:", err);
    } finally {
      setLoading(false);
    }
  };

  // === Exportar a Excel ===
  const exportarExcel = () => {
    const hojaResumen = resumen.map((r: ResumenFinanciero) => ({
      "Clase Contable": r.clase,
      "Valor Calculado": r.valor,
      "Interpretacion": r.interpretacion,
    }));

    const hojaIndicadores = Object.entries(indicadores).map(([key, valor]) => ({
      Indicador: key.replace(/_/g, " ").toUpperCase(),
      Valor:
        valor !== null && !isNaN(Number(valor))
          ? Number(valor).toFixed(2)
          : "—",
      Interpretacion: interpretaciones[key] || "",
    }));

    const hojaConclusiones = conclusiones.map((c: string, idx: number) => ({
      N: idx + 1,
      Diagnostico: c,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaResumen), "Resumen_Tecnico");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaIndicadores), "Indicadores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hojaConclusiones), "Conclusiones");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `indicadores_financieros_${anio}.xlsx`);
  };

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">📊 Indicadores Financieros Ejecutivos</h1>
      <p className="text-gray-600">
        Análisis técnico y diagnóstico automático basado en los saldos contables del balance de prueba.
      </p>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              placeholder="Año"
            />
            <Input
              type="number"
              value={mesInicio}
              onChange={(e) => setMesInicio(Number(e.target.value))}
              placeholder="Mes inicio"
            />
            <Input
              type="number"
              value={mesFin}
              onChange={(e) => setMesFin(Number(e.target.value))}
              placeholder="Mes fin"
            />
          </div>
          <div className="flex gap-4">
            <Button onClick={cargarIndicadores} disabled={loading}>
              {loading ? "Calculando..." : "Calcular Indicadores"}
            </Button>
            <Button variant="outline" onClick={exportarExcel} disabled={!resumen.length}>
              Exportar a Excel 📥
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Técnico */}
      {resumen.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📘 Resumen Técnico del Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr className="text-left border-b">
                  <th className="p-2">Clase Contable</th>
                  <th className="p-2">Valor Calculado</th>
                  <th className="p-2">Interpretación</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r: ResumenFinanciero, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-medium">{r.clase}</td>
                    <td className="p-2 text-right font-mono">
                      {Number(r.valor || 0).toLocaleString("es-CO")}
                    </td>
                    <td className="p-2 text-gray-700">{r.interpretacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Indicadores */}
      {Object.keys(indicadores).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Indicadores Financieros</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(indicadores).map(([k, v]) => {
              const color = getIndicatorColor(k, v as number | null);
              return (
                <div key={k} className={`p-4 border rounded shadow-sm ${color}`}>
                  <h4 className="text-md font-semibold capitalize">{k.replace(/_/g, " ")}</h4>
                  <p className="text-xl font-mono">
                    {v !== null && !isNaN(Number(v)) ? Number(v).toFixed(2) : "—"}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    {interpretaciones[k] || ""}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Conclusiones */}
      {conclusiones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🔍 Diagnóstico Financiero Automático</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2 text-gray-800 text-sm">
              {conclusiones.map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
