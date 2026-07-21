// Archivo: ReporteComprasProveedoresPage.tsx

"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
import { getDefaultYearToDateRange } from "@/lib/dateDefaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
} from "recharts";
import { Select, SelectItem } from "@/components/ui/select";

interface ProveedorResumen {
  proveedor_nombre: string;
  proveedor_identificacion: string;
  total_compras: number;
  total_saldo: number;
  total_pagado: number;
  num_compras: number;
  ultima_fecha: string;
}

interface FacturaDetalle {
  proveedor_identificacion: string;
  proveedor_nombre: string;
  fecha: string;
  vencimiento: string;
  total: number;
  saldo: number;
  factura: string;
  idcompra: string;
  factura_proveedor: string;
  estado: "pagado" | "pendiente" | "parcial";
  centro_costo_nombre?: string;
}

interface CentroCosto {
  id: string;
  nombre: string;
}

interface ComprasProveedoresKpis {
  total_proveedores: number;
  total_documentos: number;
  total_compras: number;
  total_facturas: number;
  total_compras_factura: number;
  total_cuentas_cobro: number;
  total_compras_cuenta_cobro: number;
  total_pagado: number;
  total_saldo: number;
}

//function abreviarNumero(valor: number): string {
//  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
//  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
//  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
//  return valor.toString();
//}

function abreviarNumero(valor: number): string {
  const n = Number(valor || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    const millones = n / 1_000_000;
    return `${millones.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000_000) {
    const millones = n / 1_000_000;
    return `${millones.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    const miles = n / 1_000;
    return `${miles.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
  }
  return `${Math.round(n).toLocaleString("es-CO")}`;
}


function formatMiles(valor: number | string): string {
  const n = typeof valor === "number" ? valor : parseFloat(valor || "0");
  return `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

function formatCantidad(valor: number): string {
  return Number(valor || 0).toLocaleString("es-CO");
}

function formatFecha(fecha?: string): string {
  if (!fecha) return "-";

  // No usar new Date(fecha) + format(): para una fecha sin hora
  // ("2026-03-24"), JS la interpreta como medianoche UTC y luego el
  // navegador la muestra en su zona horaria local - en Bogotá (UTC-5) eso
  // corre la fecha un día hacia atrás (confirmado real 2026-07-21: esta
  // página mostraba un día antes que las otras 2 páginas de compras para
  // el mismo documento). Se recorta el string directo, sin pasar por Date.
  const raw = String(fecha).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return "-";

  return `${d}-${m}-${y}`;
}

function labelEstado(estado: FacturaDetalle["estado"]): string {
  if (estado === "pagado") return "Pagado";
  if (estado === "parcial") return "Parcial";
  return "Pendiente";
}

export default function ReporteComprasProveedoresPage() {
  const [proveedores, setProveedores] = useState<ProveedorResumen[]>([]);
  const [detalle, setDetalle] = useState<FacturaDetalle[]>([]);

  const [kpis, setKpis] = useState<ComprasProveedoresKpis>({
    total_proveedores: 0,
    total_documentos: 0,
    total_compras: 0,
    total_facturas: 0,
    total_compras_factura: 0,
    total_cuentas_cobro: 0,
    total_compras_cuenta_cobro: 0,
    total_pagado: 0,
    total_saldo: 0,
  });

  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
  const [busquedaProveedor, setBusquedaProveedor] = useState<string>("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState<boolean>(false);

  const [estadoPago, setEstadoPago] = useState<string>("");
  const [centroCostos, setCentroCostos] = useState<string>("");
  const [centros, setCentros] = useState<CentroCosto[]>([]);

  const [defaultDates] = useState(() => getDefaultYearToDateRange());

  const [fechaDesde, setFechaDesde] = useState<string>(defaultDates.desde);
  const [fechaHasta, setFechaHasta] = useState<string>(defaultDates.hasta);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCentros = async () => {
      try {
        let url = "/catalogos/centros-costo-reales";
        const q: string[] = [];
        if (fechaDesde) q.push(`desde=${fechaDesde}`);
        if (fechaHasta) q.push(`hasta=${fechaHasta}`);
        if (q.length) url += `?${q.join("&")}`;

        const data = await authFetch(url);
        setCentros(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error cargando centros de costo reales:", error);
        setCentros([]);
      }
    };

    fetchCentros();
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      let url = "/reportes/compras/proveedores?detalle=1";
      if (fechaDesde) url += `&desde=${fechaDesde}`;
      if (fechaHasta) url += `&hasta=${fechaHasta}`;
      if (estadoPago) url += `&estado=${estadoPago.toLowerCase()}`;
      if (centroCostos) url += `&centro_costos=${encodeURIComponent(centroCostos)}`;

      try {
        const res = await authFetch(url);

        const resumen = res?.resumen || [];
        const detalleRaw = res?.detalle || [];
        const kpisRaw = res?.kpis || {};

        const conTotales = resumen.map((p: any) => ({
          ...p,
          total_compras: Number(p.total_compras || 0),
          total_saldo: Number(p.total_saldo || 0),
          total_pagado: Number(
            p.total_pagado || Number(p.total_compras || 0) - Number(p.total_saldo || 0)
          ),
          num_compras: Number(p.num_compras || 0),
        }));

        setProveedores(conTotales);
        setDetalle(detalleRaw);

        setKpis({
          total_proveedores: Number(kpisRaw.total_proveedores || 0),
          total_documentos: Number(kpisRaw.total_documentos || 0),
          total_compras: Number(kpisRaw.total_compras || 0),
          total_facturas: Number(kpisRaw.total_facturas || 0),
          total_compras_factura: Number(kpisRaw.total_compras_factura || 0),
          total_cuentas_cobro: Number(kpisRaw.total_cuentas_cobro || 0),
          total_compras_cuenta_cobro: Number(kpisRaw.total_compras_cuenta_cobro || 0),
          total_pagado: Number(kpisRaw.total_pagado || 0),
          total_saldo: Number(kpisRaw.total_saldo || 0),
        });
      } catch (error) {
        console.error("Error cargando reporte de compras por proveedor:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fechaDesde, fechaHasta, estadoPago, centroCostos]);

  const proveedoresOrdenados = [...proveedores].sort((a, b) =>
    a.proveedor_nombre.localeCompare(b.proveedor_nombre)
  );

  const proveedoresSugeridos = proveedoresOrdenados
    .filter((p) => {
      const busqueda = busquedaProveedor.trim().toLowerCase();
      if (!busqueda) return false;

      const texto = `${p.proveedor_nombre} ${p.proveedor_identificacion}`.toLowerCase();
      return texto.includes(busqueda);
    })
    .slice(0, 12);

  const seleccionarProveedor = (proveedor: ProveedorResumen) => {
    setProveedorSeleccionado(proveedor.proveedor_identificacion);
    setBusquedaProveedor(
      `${proveedor.proveedor_nombre} - ${proveedor.proveedor_identificacion}`
    );
    setMostrarSugerencias(false);
  };

  const limpiarProveedor = () => {
    setProveedorSeleccionado("");
    setBusquedaProveedor("");
    setMostrarSugerencias(false);
  };

  const proveedoresFiltrados = proveedores
    .filter((p) =>
      proveedorSeleccionado
        ? p.proveedor_identificacion === proveedorSeleccionado
        : true
    )
    .sort((a, b) => b.total_compras - a.total_compras);

  const facturasFiltradas = detalle.filter(
    (f) => f.proveedor_identificacion === proveedorSeleccionado
  );

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Cargando reporte de compras por proveedor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">
        📦 Reporte de Compras por Proveedor
      </h1>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Total Compras</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-blue-600">
            {formatMiles(kpis.total_compras)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Proveedores</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-purple-600">
            {formatCantidad(kpis.total_proveedores)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compras con Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-700">
              {formatMiles(kpis.total_compras_factura)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCantidad(kpis.total_facturas)} facturas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas de Cobro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">
              {formatMiles(kpis.total_compras_cuenta_cobro)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCantidad(kpis.total_cuentas_cobro)} cuentas de cobro
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pendiente actual del periodo

              <span className="group relative inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-gray-400 text-xs font-bold text-gray-600">
                ?

                <span className="pointer-events-none absolute right-0 top-7 z-50 hidden w-72 rounded-md bg-gray-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block">
                  Lo que hoy sigue pendiente de pago, pero solamente de los documentos cuya fecha está entre el rango seleccionado.
                </span>
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="text-xl font-bold text-red-600">
            {formatMiles(kpis.total_saldo)}
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7 items-start">
        {/* Buscador rápido */}
        <div className="flex flex-col space-y-1 relative lg:col-span-2">
          <label className="text-sm font-medium">Buscar proveedor</label>

          <Input
            type="text"
            value={busquedaProveedor}
            placeholder="Escribe parte del nombre o NIT..."
            onFocus={() => {
              if (busquedaProveedor.trim()) setMostrarSugerencias(true);
            }}
            onChange={(e) => {
              setBusquedaProveedor(e.target.value);
              setMostrarSugerencias(true);

              if (!e.target.value.trim()) {
                setProveedorSeleccionado("");
              }
            }}
          />

          {mostrarSugerencias &&
            busquedaProveedor.trim() &&
            proveedoresSugeridos.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg">
                {proveedoresSugeridos.map((p) => (
                  <button
                    key={p.proveedor_identificacion}
                    type="button"
                    onClick={() => seleccionarProveedor(p)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    <div className="font-medium">{p.proveedor_nombre}</div>
                    <div className="text-xs text-gray-500">
                      NIT: {p.proveedor_identificacion} · Compras:{" "}
                      {formatCantidad(p.num_compras)}
                    </div>
                  </button>
                ))}
              </div>
            )}

          {mostrarSugerencias &&
            busquedaProveedor.trim() &&
            proveedoresSugeridos.length === 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-md border bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
                No se encontraron proveedores
              </div>
            )}

          {proveedorSeleccionado && (
            <button
              type="button"
              onClick={limpiarProveedor}
              className="mt-1 text-left text-xs font-medium text-red-600 hover:text-red-800"
            >
              Limpiar proveedor seleccionado
            </button>
          )}
        </div>

        {/* Selector tradicional conservado */}
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Selector proveedor</label>
          <Select
            value={proveedorSeleccionado}
            onChange={(e) => {
              const id = e.target.value;
              setProveedorSeleccionado(id);

              if (!id) {
                setBusquedaProveedor("");
                setMostrarSugerencias(false);
                return;
              }

              const proveedor = proveedores.find(
                (p) => p.proveedor_identificacion === id
              );

              if (proveedor) {
                setBusquedaProveedor(
                  `${proveedor.proveedor_nombre} - ${proveedor.proveedor_identificacion}`
                );
              }

              setMostrarSugerencias(false);
            }}
          >
            <option value="">Todos los proveedores</option>
            {proveedoresOrdenados.map((p) => (
              <SelectItem
                key={p.proveedor_identificacion}
                value={p.proveedor_identificacion}
                label={p.proveedor_nombre}
              />
            ))}
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Estado de pago</label>
          <Select value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)}>
            <option value="">Todos</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Centro de Costos</label>
          <Select
            value={centroCostos}
            onChange={(e) => setCentroCostos(e.target.value)}
          >
            <option value="">Todos</option>
            {centros.map((cc) => (
              <SelectItem key={cc.id} value={cc.id} label={cc.nombre} />
            ))}
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Fecha desde</label>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Fecha hasta</label>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-md">📊 Compras por Proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={proveedoresFiltrados.slice(0, 15)}
              margin={{ top: 30, left: 60, right: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="proveedor_nombre"
                interval={0}
                tick={({ x, y, payload }) => {
                  const total = proveedoresFiltrados.length;
                  const fontSize = total > 10 ? 10 : 12;
                  const angle = total > 6 ? -30 : 0;

                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor={angle === 0 ? "middle" : "end"}
                      transform={`rotate(${angle},${x},${y})`}
                      fontSize={fontSize}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                height={60}
              />

              <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />

              <Tooltip
                formatter={(value: number) =>
                  `$${Number(value).toLocaleString("es-CO")}`
                }
              />

              <Bar dataKey="total_compras" radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="total_compras"
                  position="top"
                  content={({ x, y, value }) => (
                    <text x={x} y={y} dy={-4} fontSize={10} textAnchor="middle">
                      {abreviarNumero(Number(value))}
                    </text>
                  )}
                />

                {proveedoresFiltrados.slice(0, 15).map((p, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill="#2563eb"
                    style={{ cursor: "pointer" }}
                    onClick={() => seleccionarProveedor(p)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalle por proveedor */}
      <div
        className={`grid gap-4 ${
          proveedorSeleccionado
            ? "md:grid-cols-1"
            : "md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {proveedoresFiltrados.map((p) => (
          <Card
            key={p.proveedor_identificacion}
            onClick={() => seleccionarProveedor(p)}
            className={`relative shadow-md cursor-pointer hover:shadow-lg transition ${
              proveedorSeleccionado === p.proveedor_identificacion
                ? "ring-2 ring-blue-500"
                : ""
            } ${
              proveedorSeleccionado === p.proveedor_identificacion
                ? "text-base"
                : "text-sm"
            }`}
          >
            {proveedorSeleccionado === p.proveedor_identificacion && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  limpiarProveedor();
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-black font-bold"
              >
                ✖
              </button>
            )}

            <CardHeader>
              <CardTitle>{p.proveedor_nombre}</CardTitle>
              <p className="text-xs text-gray-500">
                NIT: {p.proveedor_identificacion}
              </p>
            </CardHeader>

            <CardContent>
              <div className="space-y-1">
                <p>
                  Total Compras: <b>{formatMiles(p.total_compras)}</b>
                </p>
                <p>
                  Total Pagado:{" "}
                  <span className="text-green-700">
                    {formatMiles(p.total_pagado)}
                  </span>
                </p>
                <p>
                  Saldo Pendiente:{" "}
                  <span className="text-red-600">{formatMiles(p.total_saldo)}</span>
                </p>
                <p># Compras: {formatCantidad(p.num_compras)}</p>
                <p>Última compra: {formatFecha(p.ultima_fecha)}</p>
              </div>

              {proveedorSeleccionado === p.proveedor_identificacion &&
                facturasFiltradas.length > 0 && (
                  <div className="mt-4 border-t pt-2">
                    <details open>
                      <summary className="cursor-pointer font-semibold text-blue-600">
                        Ver detalle de facturas
                      </summary>

                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-xs border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1 text-left">Factura</th>
                              <th className="px-2 py-1 text-left">Documento</th>
                              <th className="px-2 py-1 text-left">
                                Factura Proveedor
                              </th>
                              <th className="px-2 py-1 text-left">Fecha</th>
                              <th className="px-2 py-1 text-left">Vencimiento</th>
                              <th className="px-2 py-1 text-left">Estado</th>
                              <th className="px-2 py-1 text-left">Centro de Costo</th>
                              <th className="px-2 py-1 text-right">Total</th>
                              <th className="px-2 py-1 text-right">Saldo</th>
                            </tr>
                          </thead>

                          <tbody>
                            {facturasFiltradas.map((f, i) => (
                              <tr
                                key={`${f.idcompra}-${i}`}
                                className={
                                  f.estado === "pendiente"
                                    ? "text-red-700"
                                    : f.estado === "parcial"
                                    ? "text-orange-700"
                                    : ""
                                }
                              >
                                <td className="px-2 py-1">
                                  {f.factura || `#${i + 1}`}
                                </td>
                                <td className="px-2 py-1">{f.idcompra}</td>
                                <td className="px-2 py-1">
                                  {f.factura_proveedor || "-"}
                                </td>
                                <td className="px-2 py-1">
                                  {formatFecha(f.fecha)}
                                </td>
                                <td className="px-2 py-1">
                                  {formatFecha(f.vencimiento)}
                                </td>
                                <td className="px-2 py-1">
                                  {labelEstado(f.estado)}
                                </td>
                                <td className="px-2 py-1">
                                  {f.centro_costo_nombre || "—"}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {formatMiles(f.total)}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {formatMiles(f.saldo)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}