"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ---------------------- Helpers ---------------------- */
function fmtNum(n: number | null): string {
  if (n === null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function fmt2(n: number | null): string {
  if (n === null || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(2);
}

function colorSemaforo(key: string, valor: number | null): string {
  if (valor === null) return "bg-gray-100";
  switch (key) {
    case "liquidez":
      return valor < 1 ? "bg-red-200" : valor < 2 ? "bg-yellow-100" : "bg-green-100";
    case "apalancamiento":
      return valor > 0.8 ? "bg-red-200" : valor > 0.6 ? "bg-yellow-100" : "bg-green-100";
    case "rentabilidad":
      return valor < 0 ? "bg-red-200" : valor < 0.1 ? "bg-yellow-100" : "bg-green-100";
    case "autonomia":
      return valor < 0.3 ? "bg-red-200" : valor < 0.5 ? "bg-yellow-100" : "bg-green-100";
    case "solvencia":
    case "cobertura_activo_pasivo":
      return valor < 1 ? "bg-red-200" : valor < 1.5 ? "bg-yellow-100" : "bg-green-100";
    case "capital_trabajo":
      return valor < 0 ? "bg-red-200" : "bg-green-100";
    default:
      return "bg-gray-50";
  }
}

function iconoSemaforo(key: string, valor: number | null): string {
  if (valor === null) return "⚪";
  switch (key) {
    case "liquidez":
      return valor < 1 ? "🔴" : valor < 2 ? "🟡" : "🟢";
    case "apalancamiento":
      return valor > 0.8 ? "🔴" : valor > 0.6 ? "🟡" : "🟢";
    case "rentabilidad":
      return valor < 0 ? "🔴" : valor < 0.1 ? "🟡" : "🟢";
    case "autonomia":
      return valor < 0.3 ? "🔴" : valor < 0.5 ? "🟡" : "🟢";
    case "solvencia":
      return valor < 1 ? "🔴" : valor < 1.5 ? "🟡" : "🟢";
    case "capital_trabajo":
      return valor < 0 ? "🔴" : "🟢";
    default:
      return "⚪";
  }
}

function formatCurrencyMiles(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0);
}


function diagCorto(key: string, valor: number | null): string {
  if (valor === null) return "Sin datos";
  switch (key) {
    case "liquidez":
      return valor > 3 ? "Exceso de liquidez" : valor >= 1 ? "Liquidez saludable" : "Riesgo de iliquidez";
    case "apalancamiento":
      return valor > 0.8 ? "Endeudamiento alto" : valor > 0.6 ? "Apalancamiento moderado" : "Deuda controlada";
    case "rentabilidad":
      return valor < 0 ? "Pérdidas netas" : valor < 0.1 ? "Rentabilidad baja" : "Rentabilidad sólida";
    case "autonomia":
      return valor < 0.3 ? "Alta deuda externa" : valor < 0.5 ? "Dependencia moderada" : "Buena autonomía";
    case "solvencia":
      return valor < 1 ? "Riesgo de insolvencia" : valor < 1.5 ? "Solvencia ajustada" : "Buena solvencia";
    case "capital_trabajo":
      return valor < 0 ? "Capital de trabajo negativo" : "Colchón operativo positivo";
    case "cobertura_activo_pasivo":
      return valor < 1 ? "Activos insuficientes para cubrir pasivos" : "Cobertura adecuada";
    default:
      return "";
  }
}

/* ---------------------- Página ---------------------- */
export default function IndicadoresFinancierosPage() {
  const [anio, setAnio] = useState<number>(2025);
  const [mesInicio, setMesInicio] = useState<number>(1);
  const [mesFin, setMesFin] = useState<number>(12);

  const [resumen, setResumen] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<Record<string, number | null>>({});
  const [explicaciones, setExplicaciones] = useState<Record<string, string>>({});
  const [interpretaciones, setInterpretaciones] = useState<Record<string, string>>({});

  const [conclusiones, setConclusiones] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await authFetch(
        `/reportes/indicadores/financieros?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
      );
      setResumen(data.resumen_financiero || []);
      setIndicadores(data.indicadores || {});
      setExplicaciones(data.explicaciones || {});
      setInterpretaciones(data.interpretaciones || {});
      setConclusiones(data.conclusiones || []);
    } catch (e) {
      console.error("Error cargando indicadores:", e);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    const hojaResumen = XLSX.utils.json_to_sheet(
      resumen.map((r) => ({
        "Clase Contable": r.clase,
        "Valor": r.valor,
        "Interpretación": r.interpretacion,
      }))
    );

    const hojaIndicadores = XLSX.utils.json_to_sheet(
      Object.entries(indicadores).map(([k, v]) => ({
        Indicador: k.replace(/_/g, " ").toUpperCase(),
        Valor: typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—",
        Explicacion: explicaciones[k] || "",
        Interpretacion: interpretaciones[k] || "",
      }))
    );

    const hojaConclusiones = XLSX.utils.json_to_sheet(
      conclusiones.map((c, i) => ({ N: i + 1, Diagnostico: c }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, hojaResumen, "Resumen_Tecnico");
    XLSX.utils.book_append_sheet(wb, hojaIndicadores, "Indicadores");
    XLSX.utils.book_append_sheet(wb, hojaConclusiones, "Conclusiones");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `indicadores_financieros_${anio}.xlsx`);
  };

  const kpisPrincipales = ["liquidez", "apalancamiento", "rentabilidad", "autonomia"];
  const kpisComplementarios = [
    "capital_trabajo",
    "cobertura_activo_pasivo",
    "porcentaje_activo_no_corriente",
    "porcentaje_pasivo_corto",
    "solvencia",
    "endeudamiento_largo_plazo",
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">📈 Indicadores Financieros</h1>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Año</label>
              <Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Mes Inicio</label>
              <Input type="number" value={mesInicio} onChange={(e) => setMesInicio(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Mes Fin</label>
              <Input type="number" value={mesFin} onChange={(e) => setMesFin(Number(e.target.value))} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={cargar} disabled={loading}>{loading ? "Calculando..." : "Calcular Indicadores"}</Button>
            <Button variant="outline" onClick={exportarExcel}>Exportar a Excel</Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Técnico */}
      {resumen.length > 0 && (
        <Card>
          <CardHeader><CardTitle>📘 Resumen Técnico del Balance</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Clase Contable</th>
                  <th className="p-2 text-center">Valor</th>
                  <th className="p-2 text-left">Interpretación</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.clase}</td>
                    <td className="p-2 text-center font-mono">{fmtNum(r.valor)}</td>
                    <td className="p-2">{r.interpretacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Indicadores Financieros */}
      {Object.keys(indicadores).length > 0 && (
        <Card>
          <CardHeader><CardTitle>📊 Indicadores Financieros</CardTitle></CardHeader>
          <CardContent className="space-y-8">

            {/* KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {kpisPrincipales.map((k) => {
                const v = indicadores[k];
                const num = typeof v === "number" ? v : null;
                return (
                  <div key={k} className={`p-4 rounded-lg text-center shadow ${colorSemaforo(k, num)}`}>
                    <span className="text-3xl">{iconoSemaforo(k, num)}</span>
                    <h4 className="font-semibold capitalize">{k}</h4>
                    <p className="text-2xl font-bold">
                        {k === "capital_trabajo" && typeof v === "number" && isFinite(v)
                            ? formatCurrencyMiles(v)
                            : fmt2(v)}
                    </p>
                    <p className="text-xs text-gray-700 font-medium">{diagCorto(k, num)}</p>
                    <p className="text-xs text-gray-500 italic">{explicaciones[k]}</p>


                  </div>
                );
              })}
            </div>

            {/* KPIs complementarios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kpisComplementarios.map((k) => {
                const v = indicadores[k];
                const num = typeof v === "number" ? v : null;
                return (
                  <div key={k} className={`p-4 rounded-lg text-center shadow ${colorSemaforo(k, num)}`}>
                    <span className="text-3xl">{iconoSemaforo(k, num)}</span>
                    <h4 className="font-semibold capitalize">{k.replace(/_/g, " ")}</h4>
                    <p className="text-2xl font-bold">
                        {k === "capital_trabajo" && typeof v === "number" && isFinite(v)
                            ? formatCurrencyMiles(v)
                            : fmt2(v)}
                    </p>

                    <p className="text-xs text-gray-700">{explicaciones[k]}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnóstico */}
      {conclusiones.length > 0 && (
        <Card>
          <CardHeader><CardTitle>💡 Diagnóstico Financiero Automático</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 text-sm space-y-1 text-gray-800">
              {conclusiones.map((c, i) => (<li key={i}>{c}</li>))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
