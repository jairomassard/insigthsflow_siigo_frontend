// Archivo: ReporteComprasProveedoresPage.tsx

"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api";
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
  Cell
} from "recharts";
import { Select, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";

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
  estado: "pagado" | "pendiente";  // 👈 viene directo del backend
}

function abreviarNumero(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000_000).toFixed(1)}B`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return valor.toString();
}

function formatMiles(valor: number | string): string {
  const n = typeof valor === "number" ? valor : parseFloat(valor);
  return `$ ${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

export default function ReporteComprasProveedoresPage() {
  const [proveedores, setProveedores] = useState<ProveedorResumen[]>([]);
  const [detalle, setDetalle] = useState<FacturaDetalle[]>([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
  const [estadoPago, setEstadoPago] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let url = "/reportes/compras/proveedores?detalle=1";
      if (fechaDesde) url += `&desde=${fechaDesde}`;
      if (fechaHasta) url += `&hasta=${fechaHasta}`;
      if (estadoPago) url += `&estado=${estadoPago.toLowerCase()}`; // 👈 backend espera "pagado"/"pendiente"

      try {
        const res = await authFetch(url);
        const resumen = res?.resumen || [];
        const detalleRaw = res?.detalle || [];

        // Ya no recalculamos estado, solo dejamos totales
        const conTotales = resumen.map((p: any) => ({
          ...p,
          total_pagado: Number(p.total_pagado || p.total_compras - p.total_saldo),
        }));

        setProveedores(conTotales);
        setDetalle(detalleRaw);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fechaDesde, fechaHasta, estadoPago]);

  const proveedoresFiltrados = proveedores
    .filter((p) =>
      proveedorSeleccionado ? p.proveedor_identificacion === proveedorSeleccionado : true
    )
    .sort((a, b) => b.total_compras - a.total_compras);

  const facturasFiltradas = detalle.filter(
    (f) => f.proveedor_identificacion === proveedorSeleccionado
  );

  const totalCompras = proveedoresFiltrados.reduce(
    (sum, p) => sum + Number(p.total_compras),
    0
  );
  const totalPagado = proveedoresFiltrados.reduce(
    (sum, p) => sum + Number(p.total_pagado),
    0
  );
  const totalSaldo = proveedoresFiltrados.reduce(
    (sum, p) => sum + Number(p.total_saldo),
    0
  );
  const totalFacturas = proveedoresFiltrados.reduce(
    (sum, p) => sum + p.num_compras,
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">📦 Reporte de Compras por Proveedor</h1>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle>Total Compras</CardTitle></CardHeader><CardContent className="text-xl font-bold text-blue-600">{formatMiles(totalCompras)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Pagado</CardTitle></CardHeader><CardContent className="text-xl font-bold text-green-600">{formatMiles(totalPagado)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Pendiente</CardTitle></CardHeader><CardContent className="text-xl font-bold text-red-600">{formatMiles(totalSaldo)}</CardContent></Card>
        <Card><CardHeader><CardTitle># Compras</CardTitle></CardHeader><CardContent className="text-xl font-bold text-black-600">{formatMiles(totalFacturas)}</CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="grid gap-2 md:grid-cols-4">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Proveedor</label>
          <Select value={proveedorSeleccionado} onChange={(e) => setProveedorSeleccionado(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.sort((a, b) => a.proveedor_nombre.localeCompare(b.proveedor_nombre)).map((p, idx) => (
              <SelectItem key={idx} value={p.proveedor_identificacion} label={p.proveedor_nombre} />
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
          <label className="text-sm font-medium">Fecha desde</label>
          <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium">Fecha hasta</label>
          <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-md">📊 Compras por Proveedor</CardTitle></CardHeader>
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
              <Tooltip formatter={(value: number) => `$${Number(value).toLocaleString("es-CO")}`} />
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
                {proveedoresFiltrados.slice(0, 15).map((_, i) => (
                  <Cell key={`cell-${i}`} fill="#2563eb" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalle por proveedor */}
      <div className={`grid gap-4 ${proveedorSeleccionado ? "md:grid-cols-1" : "md:grid-cols-2 lg:grid-cols-3"}`}>
        {proveedoresFiltrados.map((p, idx) => (
          <Card key={idx} className={`shadow-md ${proveedorSeleccionado === p.proveedor_identificacion ? "text-base" : "text-sm"}`}>
            <CardHeader>
              <CardTitle>{p.proveedor_nombre}</CardTitle>
              <p className="text-xs text-gray-500">NIT: {p.proveedor_identificacion}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p>Total Compras: <b>{formatMiles(p.total_compras)}</b></p>
                <p>Total Pagado: <span className="text-green-700">{formatMiles(p.total_pagado)}</span></p>
                <p>Saldo Pendiente: <span className="text-red-600">{formatMiles(p.total_saldo)}</span></p>
                <p># Compras: {formatMiles(p.num_compras)}</p>
                <p>Última compra: {format(new Date(p.ultima_fecha), "dd-MM-yyyy")}</p>
              </div>
              {proveedorSeleccionado === p.proveedor_identificacion && facturasFiltradas.length > 0 && (
                <div className="mt-4 border-t pt-2">
                  <details>
                    <summary className="cursor-pointer font-semibold text-blue-600">Ver detalle de facturas</summary>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-xs border">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-1 text-left">Factura</th>
                            <th className="px-2 py-1 text-left">Factura Nombre</th>
                            <th className="px-2 py-1 text-left">Fecha</th>
                            <th className="px-2 py-1 text-left">Vencimiento</th>
                            <th className="px-2 py-1 text-left">Estado</th>
                            <th className="px-2 py-1 text-right">Total</th>
                            <th className="px-2 py-1 text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facturasFiltradas.map((f, i) => (
                            <tr key={i} className={f.estado === "pendiente" ? "text-red-700" : ""}>
                              <td className="px-2 py-1">{f.factura || `#${i + 1}`}</td>
                              <td className="px-2 py-1">{f.idcompra}</td>
                              <td className="px-2 py-1">{format(new Date(f.fecha), "dd-MM-yyyy")}</td>
                              <td className="px-2 py-1">{format(new Date(f.vencimiento), "dd-MM-yyyy")}</td>
                              <td className="px-2 py-1">{f.estado === "pagado" ? "Pagado" : "Pendiente"}</td>
                              <td className="px-2 py-1 text-right">{formatMiles(f.total)}</td>
                              <td className="px-2 py-1 text-right">{formatMiles(f.saldo)}</td>
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
