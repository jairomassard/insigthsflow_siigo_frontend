"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Download, UploadCloud, FileSpreadsheet } from "lucide-react";
import { authFetch } from "@/lib/api";

/* -------- helpers -------- */
function formatCurrency(valor: number): string {
  return `$ ${Math.round(Number(valor || 0)).toLocaleString("es-CO")}`;
}

function formatCurrencyMiles(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0);
}

function formatShortNumber(valor: number): string {
  const absValor = Math.abs(valor);
  const signo = valor < 0 ? "-" : "";
  if (absValor >= 1_000_000_000) {
    return `${signo}${(absValor / 1_000_000).toFixed(1)}M`;
  } else if (absValor >= 1_000_000) {
    return `${signo}${(absValor / 1_000_000).toFixed(1)}M`;
  } else if (absValor >= 1_000) {
    return `${signo}${(absValor / 1_000).toFixed(0)}K`;
  } else {
    return `${signo}${absValor}`;
  }
}

export default function BalanceDePruebaPage() {
  const [anio, setAnio] = useState(2025);
  const [mesInicio, setMesInicio] = useState(1);
  const [mesFin, setMesFin] = useState(12);

  const [generando, setGenerando] = useState(false);
  const [linkDescarga, setLinkDescarga] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [resumenClase, setResumenClase] = useState<any[]>([]);

  const [resumenGrupos, setResumenGrupos] = useState<any[]>([]);
  const [detalleGrupos, setDetalleGrupos] = useState<any[]>([]);
  const [indicadores, setIndicadores] = useState<any>(null);
  const [conclusiones, setConclusiones] = useState<string[]>([]);

  const explicacion: Record<string, string> = {
    Ingresos: "Se muestran como positivos para facilitar el análisis.",
    Costos: "Gastos directos operativos.",
    Gastos: "Gasto administrativo y de ventas.",
    "Resultado Neto (Utilidad o Pérdida)":
      "Pérdida o utilidad del período, calculada como: Ingresos − (Costos + Gastos).",
    Activo: "Total de activos acumulados.",
    Pasivo: "Representado como negativo (deuda).",
    Patrimonio: "Patrimonio neto negativo o positivo.",
  };

  // Generar balance desde Siigo
  const generarBalance = async () => {
    setGenerando(true);
    setErrorDescarga(null);
    setLinkDescarga(null);
    try {
      const payload = {
        year: anio,
        month_start: mesInicio,
        month_end: mesFin,
        includes_tax_difference: false,
      };
      const data = await authFetch("/siigo/balance/generar", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (data.file_url) {
        setLinkDescarga(data.file_url);
      } else {
        setErrorDescarga(data.error || "No se pudo generar el balance.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorDescarga("Error al conectar con el servidor.");
    } finally {
      setGenerando(false);
    }
  };

  // Subir archivo Excel
  const subirBalance = async () => {
    if (!archivo) {
      alert("Debe seleccionar un archivo Excel.");
      return;
    }
    setCargando(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("anio", anio.toString());
    formData.append("mes_inicio", mesInicio.toString());
    formData.append("mes_fin", mesFin.toString());
    try {
      const res = await authFetch("/importar/balance-excel", {
        method: "POST",
        body: formData,
      });
      setImportResult(res);
    } catch (e) {
      console.error(e);
      setImportResult({ error: "Error al importar el balance." });
    } finally {
      setCargando(false);
    }
  };

  // Cargar análisis por clase contable
  const cargarResumenClase = async () => {
    try {
      const data = await authFetch(
        `/reportes/balance/clases?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
      );
      setResumenClase(data.resumen || []);
    } catch (e) {
      console.error("Error al cargar resumen clase", e);
    }
  };

  // Cargar análisis por grupo contable + indicadores
  const cargarGrupos = async () => {
    try {
      const data = await authFetch(
        `/reportes/balance/grupos?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
      );
      setResumenGrupos(data.resumen || []);
      setDetalleGrupos(data.detalle || []);
      if (data.indicadores) setIndicadores(data.indicadores);
      if (data.conclusiones) setConclusiones(data.conclusiones);
    } catch (e) {
      console.error("Error al cargar resumen de grupos", e);
    }
  };

  // Efecto: si importResult cambia y hay registros creados, recargar análisis por clase
  useEffect(() => {
    if (importResult && importResult.registros_creados > 0) {
      cargarResumenClase();
    }
  }, [importResult]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">📘 Balance de Prueba General</h1>
      <p className="text-gray-600">
        Genera, carga y analiza el balance contable de tu empresa directamente desde Siigo.
      </p>

      {/* ① Generar Balance */}
      <Card>
        <CardHeader>
          <CardTitle>① Generar Balance desde Siigo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium">Año</label>
              <Input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">Mes Inicio</label>
              <Input
                type="number"
                value={mesInicio}
                onChange={(e) => setMesInicio(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">Mes Fin</label>
              <Input
                type="number"
                value={mesFin}
                onChange={(e) => setMesFin(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <Button onClick={generarBalance} disabled={generando}>
              {generando ? "Generando..." : "Generar Balance"}{" "}
              <Download className="ml-2 w-4 h-4" />
            </Button>
          </div>
          {linkDescarga && (
            <Alert variant="success" className="mt-4">
              <AlertTitle className="font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" /> Balance disponible
              </AlertTitle>
              <AlertDescription>
                <a
                  href={linkDescarga}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Descargar aquí
                </a>
              </AlertDescription>
            </Alert>
          )}
          {errorDescarga && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorDescarga}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ② Subir Balance */}
      <Card>
        <CardHeader>
          <CardTitle>② Subir y Procesar Archivo Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".xlsx"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
          />
          <div className="mt-4 flex justify-center">
            <Button onClick={subirBalance} disabled={cargando}>
              {cargando ? "Procesando..." : "Subir y Analizar"}{" "}
              <UploadCloud className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ③ Resumen por Clase Contable */}
      <Card>
        <CardHeader>
          <CardTitle>③ Resumen Financiero por Clase Contable</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Ingresos mostrados como positivos para facilitar el análisis.
            <br />
            <strong>Resultado Neto</strong> = Ingresos − (Costos + Gastos).
          </p>
        </CardHeader>
        <CardContent>
          <Button className="mb-4" onClick={cargarResumenClase}>
            Ver Análisis Financiero 📊
          </Button>

          {resumenClase.length > 0 && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resumenClase}
                    layout="vertical"
                    margin={{ top: 20, bottom: 20, left: 100, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatShortNumber} />
                    <YAxis
                      dataKey="clase"
                      type="category"
                      width={160}
                      interval={0}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="valor" radius={[0, 8, 8, 0]}>
                      {resumenClase.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.valor >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                      <LabelList
                        dataKey="valor"
                        position="left"
                        formatter={(v: any) => formatShortNumber(Number(v))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm">
                {resumenClase.map((item, index) => (
                  <div key={index} className="flex items-start mb-2">
                    <div className="w-1/3 font-medium">{item.clase}</div>
                    <div
                      className={`w-1/3 text-center font-mono ${
                        item.valor < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {formatCurrencyMiles(item.valor)}
                    </div>
                    <span className="text-gray-500 text-left w-1/3">
                      {explicacion[item.clase as keyof typeof explicacion]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ④ Comparativo & Detalle por Grupo Contable */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>④ Comparativo & Análisis por Grupo Contable</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Visualiza los grupos con indicadores y conclusiones automáticas.
          </p>
        </CardHeader>
        <CardContent>
          <Button className="mb-4" onClick={cargarGrupos}>
            Ver Análisis Completo 📊
          </Button>

          {resumenGrupos.length > 0 && (
            <div className="space-y-6">
              {/* Gráfico comparativo */}
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resumenGrupos}
                    layout="vertical"
                    margin={{ top: 20, bottom: 20, left: 120, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatShortNumber(v as number)}
                    />
                    <YAxis dataKey="grupo" type="category" width={150} />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      labelFormatter={(label) => `Grupo: ${label}`}
                    />
                    <Bar dataKey="valor" radius={[0, 8, 8, 0]}>
                      {resumenGrupos.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.valor >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))}
                      <LabelList
                        dataKey="valor"
                        position="left"
                        formatter={(v: any) => formatCurrencyMiles(v as number)}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Indicadores automáticos */}
              {indicadores && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 border p-4 rounded">
                  <div className="text-center">
                    <h4 className="text-lg font-semibold">Liquidez</h4>
                    <p className="text-xl">
                      {indicadores.liquidez != null
                        ? Number(indicadores.liquidez).toFixed(2)
                        : "—"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Activo corriente / Pasivo corto
                    </p>
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-semibold">Apalancamiento</h4>
                    <p className="text-xl">
                      {indicadores.apalancamiento != null
                        ? Number(indicadores.apalancamiento).toFixed(2)
                        : "—"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Pasivo total / Activo total
                    </p>
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-semibold">Rentabilidad</h4>
                    <p className="text-xl">
                      {indicadores.rentabilidad != null
                        ? Number(indicadores.rentabilidad).toFixed(2)
                        : "—"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Utilidad neta / Ingresos
                    </p>
                  </div>
                </div>
              )}

              {/* Conclusiones automáticas */}
              {conclusiones && conclusiones.length > 0 && (
                <div className="mt-4 p-4 bg-white border rounded">
                  <h4 className="font-semibold mb-2">🔍 Conclusiones automáticas</h4>
                  <ul className="list-disc pl-5 text-sm text-gray-700">
                    {conclusiones.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detalle por grupo */}
              {detalleGrupos.length > 0 && (
                <div className="mt-6 space-y-4">
                  {detalleGrupos.map((grp, gi) => (
                    <div
                      key={gi}
                      className="border rounded p-4 bg-gray-50"
                    >
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        {grp.grupo}:{" "}
                        {formatCurrency(
                          resumenGrupos.find((g) => g.grupo === grp.grupo)
                            ?.valor ?? 0
                        )}
                      </h3>
                      <ul className="text-sm pl-4 list-disc">
                        {grp.cuentas.map(
                          (cu: any, i: number) => (
                            <li
                              key={i}
                              className={
                                (cu.valor < 0
                                  ? "text-red-600"
                                  : "text-gray-700") +
                                " font-mono"
                              }
                            >
                              <b>{cu.codigo}</b> - {cu.nombre}:{" "}
                              {formatCurrency(cu.valor)}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
