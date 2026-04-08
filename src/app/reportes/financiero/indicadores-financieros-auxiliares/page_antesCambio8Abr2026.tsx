"use client";

import { useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/* ---------------------- Helpers ---------------------- */
function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function fmt2(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(2);
}

function formatCurrency(valor: number | null | undefined): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function abreviarMoneda(valor: number | null | undefined): string {
  const n = Number(valor || 0);
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
}

function colorSemaforo(key: string, valor: number | null): string {
  if (valor === null) return "bg-slate-50 border-slate-200";

  switch (key) {
    case "liquidez":
      return valor < 1
        ? "bg-red-50 border-red-200"
        : valor < 2
          ? "bg-yellow-50 border-yellow-200"
          : "bg-green-50 border-green-200";

    case "apalancamiento":
      return valor > 0.8
        ? "bg-red-50 border-red-200"
        : valor > 0.6
          ? "bg-yellow-50 border-yellow-200"
          : "bg-green-50 border-green-200";

    case "rentabilidad":
      return valor < 0
        ? "bg-red-50 border-red-200"
        : valor < 0.1
          ? "bg-yellow-50 border-yellow-200"
          : "bg-green-50 border-green-200";

    case "autonomia":
      return valor < 0.3
        ? "bg-red-50 border-red-200"
        : valor < 0.5
          ? "bg-yellow-50 border-yellow-200"
          : "bg-green-50 border-green-200";

    case "solvencia":
    case "cobertura_activo_pasivo":
      return valor < 1
        ? "bg-red-50 border-red-200"
        : valor < 1.5
          ? "bg-yellow-50 border-yellow-200"
          : "bg-green-50 border-green-200";

    case "capital_trabajo":
      return valor < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";

    default:
      return "bg-slate-50 border-slate-200";
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
    case "cobertura_activo_pasivo":
      return valor < 1 ? "🔴" : valor < 1.5 ? "🟡" : "🟢";
    case "capital_trabajo":
      return valor < 0 ? "🔴" : "🟢";
    default:
      return "⚪";
  }
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
    case "porcentaje_pasivo_corto":
      return valor > 0.7 ? "Alta presión de corto plazo" : valor > 0.4 ? "Estructura equilibrada" : "Predomina deuda de largo plazo";
    case "porcentaje_activo_no_corriente":
      return valor > 0.7 ? "Alto peso de activos fijos" : valor > 0.4 ? "Composición balanceada" : "Predominio de activos corrientes";
    case "endeudamiento_largo_plazo":
      return valor === null ? "Sin datos" : valor > 1 ? "Presión alta a largo plazo" : "Presión razonable a largo plazo";
    default:
      return "";
  }
}

function nombreMesCorto(mes: string): string {
  const [year, month] = mes.split("-");
  const fecha = new Date(Number(year), Number(month) - 1, 1);
  return fecha.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

/* ---------------------- Página ---------------------- */
export default function IndicadoresFinancierosAuxiliaresPage() {
  const [anio, setAnio] = useState<number>(2026);
  const [mesInicio, setMesInicio] = useState<number>(1);
  const [mesFin, setMesFin] = useState<number>(12);

  const [resumen, setResumen] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<Record<string, number | null>>({});
  const [explicaciones, setExplicaciones] = useState<Record<string, string>>({});
  const [interpretaciones, setInterpretaciones] = useState<Record<string, string>>({});
  const [conclusiones, setConclusiones] = useState<string[]>([]);
  const [evolucionMensual, setEvolucionMensual] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [metaBalance, setMetaBalance] = useState<any>(null);
  const [resumenBalance, setResumenBalance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await authFetch(
        `/reportes/auxiliares/indicadores-financieros?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
      );

      setResumen(data.resumen_financiero || []);
      setIndicadores(data.indicadores || {});
      setExplicaciones(data.explicaciones || {});
      setInterpretaciones(data.interpretaciones || {});
      setConclusiones(data.conclusiones || []);
      setEvolucionMensual(data.evolucion_mensual || []);
      setMeta(data.meta || null);
      setMetaBalance(data.meta_balance || null);
      setResumenBalance(data.resumen_balance || null);
    } catch (e) {
      console.error("Error cargando indicadores desde auxiliares:", e);
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
      Object.entries(indicadores)
        .filter(([k]) =>
          ![
            "activo_total",
            "pasivo_total",
            "patrimonio",
            "ingresos",
            "costos",
            "gastos",
            "utilidad_neta",
            "activo_corriente",
            "activo_no_corriente",
            "pasivo_corto",
            "pasivo_largo",
          ].includes(k)
        )
        .map(([k, v]) => ({
          Indicador: k.replace(/_/g, " ").toUpperCase(),
          Valor: typeof v === "number" && isFinite(v) ? v.toFixed(2) : "—",
          Explicacion: explicaciones[k] || "",
          Interpretacion: interpretaciones[k] || "",
        }))
    );

    const hojaConclusiones = XLSX.utils.json_to_sheet(
      conclusiones.map((c, i) => ({ N: i + 1, Diagnostico: c }))
    );

    const hojaEvolucion = XLSX.utils.json_to_sheet(
      evolucionMensual.map((r) => ({
        Mes: r.mes,
        Utilidad_Neta: r.utilidad_neta,
        Rentabilidad: r.rentabilidad,
      }))
    );

    const hojaLecturaEjecutiva = XLSX.utils.json_to_sheet(
      (resumenBalance?.narrativa || []).map((c: string, i: number) => ({
        N: i + 1,
        Lectura_Ejecutiva: c,
      }))
    );

    const hojaAlertas = XLSX.utils.json_to_sheet(
      (resumenBalance?.alertas || []).map((c: string, i: number) => ({
        N: i + 1,
        Alerta: c,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, hojaResumen, "Resumen_Tecnico");
    XLSX.utils.book_append_sheet(wb, hojaIndicadores, "Indicadores");
    XLSX.utils.book_append_sheet(wb, hojaConclusiones, "Conclusiones");
    XLSX.utils.book_append_sheet(wb, hojaEvolucion, "Evolucion_Mensual");

    if ((resumenBalance?.narrativa || []).length > 0) {
      XLSX.utils.book_append_sheet(wb, hojaLecturaEjecutiva, "Lectura_Ejecutiva");
    }

    if ((resumenBalance?.alertas || []).length > 0) {
      XLSX.utils.book_append_sheet(wb, hojaAlertas, "Alertas_Balance");
    }

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `indicadores_financieros_auxiliares_${anio}_${mesInicio}_${mesFin}.xlsx`
    );
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

  const tarjetasEjecutivas = useMemo(
    () => [
      {
        key: "activo_total",
        titulo: "Activo total",
        valor: indicadores["activo_total"] ?? null,
        detalle: "Total de recursos controlados por la empresa al corte final",
        emoji: "💼",
      },
      {
        key: "pasivo_total",
        titulo: "Pasivo total",
        valor: indicadores["pasivo_total"] ?? null,
        detalle: "Obligaciones acumuladas con terceros al corte final",
        emoji: "📌",
      },
      {
        key: "patrimonio",
        titulo: "Patrimonio",
        valor: indicadores["patrimonio"] ?? null,
        detalle: "Base patrimonial o capital propio al corte final",
        emoji: "🏛️",
      },
      {
        key: "utilidad_neta",
        titulo: "Utilidad neta",
        valor: indicadores["utilidad_neta"] ?? null,
        detalle: "Resultado del período seleccionado",
        emoji: "📈",
      },
    ],
    [indicadores]
  );

  const dataGrafica = useMemo(
    () =>
      (evolucionMensual || []).map((r) => ({
        ...r,
        mes_label: nombreMesCorto(r.mes),
      })),
    [evolucionMensual]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">📈 Indicadores Financieros desde Auxiliares</h1>
        <p className="text-sm text-muted-foreground">
          Este módulo combina el balance general acumulado al corte final seleccionado y el estado
          de resultados del período analizado, para entregar una lectura financiera clara y ejecutiva.
        </p>
      </div>

      <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <CardHeader>
          <CardTitle>Seleccionar período de análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Año</label>
              <Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Mes inicio</label>
              <Input type="number" value={mesInicio} onChange={(e) => setMesInicio(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium">Mes fin</label>
              <Input type="number" value={mesFin} onChange={(e) => setMesFin(Number(e.target.value))} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={cargar} disabled={loading}>
              {loading ? "Calculando..." : "Calcular indicadores"}
            </Button>
            <Button variant="outline" onClick={exportarExcel} disabled={!resumen.length}>
              Exportar a Excel
            </Button>
          </div>

          {meta && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 leading-6">
              <strong>Fuente:</strong> Auxiliar contable &nbsp;|&nbsp;
              <strong>P&amp;L desde:</strong> {meta.fecha_desde} &nbsp;|&nbsp;
              <strong>P&amp;L hasta:</strong> {meta.fecha_hasta} &nbsp;|&nbsp;
              <strong>Balance al corte:</strong> {meta.fecha_corte_balance || meta.fecha_hasta}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/60">
        <CardHeader>
          <CardTitle>🧠 Cómo interpretar este reporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
          <p>
            Esta página combina dos lógicas contables distintas para evitar confusiones:
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Balance al corte final</p>
              <p className="text-slate-600">
                Activo, pasivo, patrimonio, liquidez, solvencia, autonomía y capital de trabajo
                se calculan con la lógica del balance general acumulado hasta la fecha final seleccionada.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Resultado del período</p>
              <p className="text-slate-600">
                Ingresos, costos, gastos, utilidad neta y rentabilidad se calculan solo con los movimientos
                del período elegido.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="font-semibold">Consistencia</p>
              <p className="text-slate-600">
                Los indicadores compartidos con Balance General deben coincidir para el mismo corte.
                La evolución mensual, por ahora, refleja el comportamiento del P&amp;L.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {resumenBalance?.narrativa?.length > 0 && (
        <Card className="border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-6 py-5 text-white">
            <h3 className="text-base font-bold tracking-wide">🧾 Lectura ejecutiva del balance al corte</h3>
            <p className="mt-1 text-xs text-slate-300">
              Interpretación automática del estado de situación financiera al cierre seleccionado.
            </p>
          </div>
          <CardContent className="p-6">
            <div className="rounded-xl border bg-slate-50 p-4">
              <ul className="space-y-2 text-sm text-slate-800">
                {resumenBalance.narrativa.map((txt: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {resumenBalance?.alertas?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle>⚠ Alertas y observaciones del balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <ul className="space-y-2 text-sm text-slate-800">
                {resumenBalance.alertas.map((txt: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{txt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tarjetasEjecutivas.map((item) => (
          <Card key={item.key} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.titulo}</p>
                  <h3 className="mt-2 text-3xl font-bold tracking-tight">{abreviarMoneda(item.valor)}</h3>
                  <p className="mt-2 text-xs text-slate-500">{item.detalle}</p>
                </div>
                <div className="text-3xl">{item.emoji}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {Object.keys(indicadores).length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>📊 Indicadores financieros clave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {kpisPrincipales.map((k) => {
                const v = indicadores[k];
                const num = typeof v === "number" ? v : null;

                return (
                  <div
                    key={k}
                    className={`rounded-2xl border p-5 shadow-sm ${colorSemaforo(k, num)}`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                        {k.replace(/_/g, " ")}
                      </h4>
                      <span className="text-2xl">{iconoSemaforo(k, num)}</span>
                    </div>

                    <p className="mt-4 text-3xl font-bold">
                      {k === "capital_trabajo" && typeof v === "number" && isFinite(v)
                        ? abreviarMoneda(v)
                        : fmt2(v)}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-700">{diagCorto(k, num)}</p>
                    <p className="mt-2 text-xs text-slate-500">{explicaciones[k]}</p>

                    {interpretaciones[k] && (
                      <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-slate-700">
                        {interpretaciones[k]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {kpisComplementarios.map((k) => {
                const v = indicadores[k];
                const num = typeof v === "number" ? v : null;

                return (
                  <div
                    key={k}
                    className={`rounded-2xl border p-5 shadow-sm ${colorSemaforo(k, num)}`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                        {k.replace(/_/g, " ")}
                      </h4>
                      <span className="text-2xl">{iconoSemaforo(k, num)}</span>
                    </div>

                    <p className="mt-4 text-2xl font-bold">
                      {k === "capital_trabajo" && typeof v === "number" && isFinite(v)
                        ? abreviarMoneda(v)
                        : fmt2(v)}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-700">{diagCorto(k, num)}</p>
                    <p className="mt-2 text-xs text-slate-500">{explicaciones[k]}</p>

                    {interpretaciones[k] && (
                      <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-slate-700">
                        {interpretaciones[k]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>📉 Evolución mensual del período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Utilidad neta mensual</h4>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGrafica}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes_label" />
                  <YAxis tickFormatter={(v) => abreviarMoneda(v)} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="utilidad_neta"
                    name="Utilidad neta"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Rentabilidad mensual</h4>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataGrafica}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes_label" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => fmt2(Number(value || 0))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rentabilidad"
                    name="Rentabilidad"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            La evolución mensual de esta página muestra, por ahora, el comportamiento de utilidad neta
            y rentabilidad del período. Los indicadores de balance del encabezado corresponden al corte
            final seleccionado, no a cada mes individual.
          </div>
        </CardContent>
      </Card>

      {resumen.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>📘 Resumen técnico del análisis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Clase contable</th>
                    <th className="p-3 text-center">Valor</th>
                    <th className="p-3 text-left">Interpretación</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3 font-medium">{r.clase}</td>
                      <td className="p-3 text-center font-mono">{fmtNum(r.valor)}</td>
                      <td className="p-3 text-slate-600">{r.interpretacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {conclusiones.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>💡 Diagnóstico financiero automático</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-slate-50 p-4">
              <ul className="space-y-2 text-sm text-slate-800">
                {conclusiones.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {metaBalance && (
        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader>
            <CardTitle>🧩 Notas técnicas del balance reconstruido</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-4">
                <p className="font-semibold">Patrimonio reconstruido</p>
                <p className="mt-2">
                  <strong>Patrimonio reportado:</strong>{" "}
                  {formatCurrency(metaBalance?.patrimonio?.patrimonio_explicito_total || 0)}
                </p>
                <p>
                  <strong>Patrimonio calculado:</strong>{" "}
                  {formatCurrency(metaBalance?.patrimonio?.patrimonio_calculado_total || 0)}
                </p>
                <p>
                  <strong>Patrimonio total:</strong>{" "}
                  {formatCurrency(metaBalance?.patrimonio?.patrimonio_total || 0)}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <p className="font-semibold">Activo no corriente</p>
                <p className="mt-2">
                  <strong>Bruto:</strong>{" "}
                  {formatCurrency(metaBalance?.activo_no_corriente?.bruto_total || 0)}
                </p>
                <p>
                  <strong>Contra cuentas / ajustes:</strong>{" "}
                  {formatCurrency(metaBalance?.activo_no_corriente?.contra_total || 0)}
                </p>
                <p>
                  <strong>Neto:</strong>{" "}
                  {formatCurrency(metaBalance?.activo_no_corriente?.neto_total || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}