"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, UploadCloud, FileSpreadsheet, BarChart2 } from "lucide-react";
import { authFetch } from "@/lib/api";
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
import { formatCurrency } from "@/lib/utils";

export default function BalanceDePruebaPage() {
  // Parámetros principales
  const [anio, setAnio] = useState(2025);
  const [mesInicio, setMesInicio] = useState(1);
  const [mesFin, setMesFin] = useState(12);

  // Estados para generación y descarga
  const [generando, setGenerando] = useState(false);
  const [linkDescarga, setLinkDescarga] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  // Estados para carga de archivo
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Estados para análisis
  const [resumen, setResumen] = useState<any[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  const [resumenClase, setResumenClase] = useState<any[]>([]);

  // --- Generar balance (descarga desde Siigo) ---
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

  // --- Subir archivo Excel ---
  const subirBalance = async () => {
    if (!archivo) return alert("Debe seleccionar un archivo Excel.");
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
      if (res?.registros_creados > 0) fetchResumen();
    } catch (e) {
      console.error(e);
      setImportResult({ error: "Error al importar el balance." });
    } finally {
      setCargando(false);
    }
  };

  // --- Obtener resumen analítico ---
  const fetchResumen = async () => {
    setCargandoResumen(true);
    try {
      const data = await authFetch(
        `/reportes/balance/resumen?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
      );
      console.log("Resumen recibido:", data.resumen);
      setResumen(data.resumen || []);
    } catch (e) {
      console.error("Error cargando resumen", e);
      setResumen([]);
    } finally {
      setCargandoResumen(false);
    }
  };

  // --- Efecto: auto recarga si hay importación exitosa ---
  useEffect(() => {
    if (importResult && importResult.registros_creados > 0) {
      fetchResumen();
    }
  }, [importResult]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">📘 Balance de Prueba General</h1>
      <p className="text-gray-600">
        Genera, carga y analiza el balance contable de tu empresa directamente desde Siigo.
      </p>

      {/* ① Generar Balance desde Siigo */}
      <Card>
        <CardHeader>
          <CardTitle>① Generar Balance desde Siigo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium">Año</label>
              <Input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">Mes Inicio</label>
              <Input
                type="number"
                min={1}
                max={12}
                value={mesInicio}
                onChange={(e) => setMesInicio(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">Mes Fin</label>
              <Input
                type="number"
                min={1}
                max={12}
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
            <div className="mt-4">
              <Alert variant="success">
                <AlertTitle className="font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" /> Balance disponible
                </AlertTitle>
                <AlertDescription>
                  Copia este enlace para descargarlo:
                  <a
                    href={linkDescarga}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 underline break-all mt-2"
                  >
                    {linkDescarga}
                  </a>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {errorDescarga && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertTitle>Error al generar balance</AlertTitle>
                <AlertDescription>{errorDescarga}</AlertDescription>
              </Alert>
            </div>
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

          {importResult && (
            <div className="mt-4 bg-gray-50 border rounded p-4 text-sm">
              {importResult.error ? (
                <p className="text-red-600 font-medium">❌ {importResult.error}</p>
              ) : (
                <>
                  <p className="text-green-600 font-semibold">
                    ✅ {importResult.mensaje || "Archivo procesado correctamente."}
                  </p>
                  <p>
                    Registros cargados: <b>{importResult.registros_creados}</b>
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* ④ Análisis por Clase Contable */}
      <Card>
        <CardHeader>
          <CardTitle>④ Resumen Financiero por Clase Contable</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Ingresos mostrados como positivos para facilitar el análisis.
            <br />
            <strong>Resultado Neto</strong> = Ingresos − (Costos + Gastos).
          </p>
        </CardHeader>
        <CardContent>
          <Button
            className="mb-4"
            onClick={async () => {
              try {
                const data = await authFetch(
                  `/reportes/balance/clases?anio=${anio}&mes_inicio=${mesInicio}&mes_fin=${mesFin}`
                );
                console.log("Resumen por clase:", data.resumen);
                setResumenClase(data.resumen || []);
              } catch (e) {
                console.error("Error al cargar resumen por clase", e);
              }
            }}
          >
            Ver Análisis Financiero 📊
          </Button>

          {resumenClase.length > 0 && (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resumenClase}
                  layout="vertical"
                  margin={{ top: 20, bottom: 20, left: 100, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <YAxis
                    dataKey="clase"
                    type="category"
                    width={140}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v))}
                    labelFormatter={(label) => `Clase: ${label}`}
                  />
                  <Bar
                    dataKey="valor"
                    radius={[0, 8, 8, 0]}
                    isAnimationActive={true}
                  >
                    {
                      resumenClase.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.valor >= 0 ? "#10b981" : "#ef4444"}
                        />
                      ))
                    }
                    <LabelList
                      dataKey="valor"
                      position="right"
                      formatter={(v: any) => formatCurrency(Number(v))}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>



    </div>
  );
}
