"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type FacturaRow = {
  factura_id: number;
  idfactura: string;
  fecha: string;
  vencimiento: string;
  cliente_nombre: string;
  estado: string;
  estado_pago: string;
  subtotal: number;
  impuestos_total: number;
  reteica: number;
  reteiva: number;
  autorretencion: number;
  total_retenciones: number;
  total: number;
  saldo: number;
  public_url: string;
  centro_costo_nombre: string | null;
  centro_costo_codigo: string | null;
  vendedor_nombre: string | null;
  descripcion: string | null;
  coincidencias: number;
};

type Summary = {
  total_registros: number;
  subtotal_total: number;
  iva_total: number;
  reteica_total: number;
  reteiva_total: number;
  autorretencion_total: number;
  retenciones_total: number;
  total_facturado: number;
  saldo_total: number;
};

function formatCurrency(value: number | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(n);
}

function abreviar(value: number | null | undefined) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function BuscadorFacturasPage() {
  const today = new Date();
  const defaultHasta = today.toISOString().slice(0, 10);
  const defaultDesde = `${today.getFullYear() - 1}-01-01`;

  const [q, setQ] = useState("zapier");
  const [idfactura, setIdfactura] = useState("");
  const [cliente, setCliente] = useState("");
  const [estadoPago, setEstadoPago] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);

  const [rows, setRows] = useState<FacturaRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buscar() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (q) params.append("q", q);
      if (idfactura) params.append("idfactura", idfactura);
      if (cliente) params.append("cliente", cliente);
      if (estadoPago) params.append("estado_pago", estadoPago);
      if (estado) params.append("estado", estado);
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);
      params.append("limit", "300");

      const resp = await authFetch(`/reportes/facturas-buscador?${params.toString()}`);
      if (!resp.ok) {
        let message = "No fue posible consultar las facturas.";
        try {
            const err = await resp.json();
            message = err?.error || err?.message || message;
            if (err?.trace) {
            console.error("TRACE BACKEND:", err.trace);
            }
        } catch (_) {}
        throw new Error(message);
    }

      const data = await resp.json();
      setRows(data.rows || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al buscar.");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    buscar();
  }, []);

  const chartData = useMemo(() => {
    const map = new Map<string, { mes: string; total: number; cantidad: number }>();

    for (const row of rows) {
      const mes = row.fecha?.slice(0, 7) || "Sin fecha";
      if (!map.has(mes)) {
        map.set(mes, { mes, total: 0, cantidad: 0 });
      }
      const item = map.get(mes)!;
      item.total += Number(row.total || 0);
      item.cantidad += 1;
    }

    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [rows]);

  function exportarCSV() {
    if (!rows.length) return;

    const headers = [
      "numero_factura",
      "fecha",
      "vencimiento",
      "cliente",
      "descripcion",
      "valor_antes_iva",
      "iva",
      "reteica",
      "reteiva",
      "autorretencion",
      "total_retenciones",
      "total",
      "saldo",
      "estado",
      "estado_pago",
      "centro_costo",
      "vendedor",
      "public_url",
    ];

    const lines = [
      headers.join(";"),
      ...rows.map((r) =>
        [
          r.idfactura,
          r.fecha,
          r.vencimiento,
          r.cliente_nombre,
          r.descripcion,
          r.subtotal,
          r.impuestos_total,
          r.reteica,
          r.reteiva,
          r.autorretencion,
          r.total_retenciones,
          r.total,
          r.saldo,
          r.estado,
          r.estado_pago,
          r.centro_costo_nombre,
          r.vendedor_nombre,
          r.public_url,
        ]
          .map(csvEscape)
          .join(";")
      ),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "busqueda_facturas_inteligente.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Buscador inteligente de facturas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Busca facturas por contenido de descripción, número, cliente y rango de fechas.
        </p>
      </div>

      <Card className="shadow-sm border-0 bg-white">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium">Palabra clave</label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: zapier"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Factura</label>
              <Input
                value={idfactura}
                onChange={(e) => setIdfactura(e.target.value)}
                placeholder="Ej: FV-2-2043"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ej: Inchcape"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado pago</label>
              <select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="pagada">Pagada</option>
                <option value="parcial">Parcial</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado factura</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="Emitida">Emitida</option>
                <option value="Anulada">Anulada</option>
                <option value="Borrador">Borrador</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={buscar} disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setQ("");
                setIdfactura("");
                setCliente("");
                setEstadoPago("");
                setEstado("");
                setDesde(defaultDesde);
                setHasta(defaultHasta);
              }}
            >
              Limpiar
            </Button>

            <Button variant="secondary" onClick={exportarCSV} disabled={!rows.length}>
              Exportar CSV
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Facturas encontradas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {summary?.total_registros ?? 0}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subtotal</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(summary?.subtotal_total)}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">IVA</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(summary?.iva_total)}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Retenciones</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(summary?.retenciones_total)}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total facturado</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(summary?.total_facturado)}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle>Evolución mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={abreviar} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Mes: ${label}`}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Factura</th>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Descripción</th>
                  <th className="px-3 py-2 font-semibold text-right">Subtotal</th>
                  <th className="px-3 py-2 font-semibold text-right">IVA</th>
                  <th className="px-3 py-2 font-semibold text-right">Retenciones</th>
                  <th className="px-3 py-2 font-semibold text-right">Total</th>
                  <th className="px-3 py-2 font-semibold text-right">Saldo</th>
                  <th className="px-3 py-2 font-semibold">Estado pago</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                      No se encontraron resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.factura_id}-${row.idfactura}`} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">{row.fecha}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium">{row.idfactura}</td>
                      <td className="px-3 py-2 min-w-[220px]">{row.cliente_nombre}</td>
                      <td className="px-3 py-2 min-w-[320px]">
                        <div className="line-clamp-3 whitespace-pre-wrap">
                          {row.descripcion || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {formatCurrency(row.subtotal)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {formatCurrency(row.impuestos_total)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {formatCurrency(row.total_retenciones)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {formatCurrency(row.saldo)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                          {row.estado_pago || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.public_url ? (
                          <a
                            href={row.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Ver factura
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}