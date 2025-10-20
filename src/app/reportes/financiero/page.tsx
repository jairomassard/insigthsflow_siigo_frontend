"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { authFetch } from "@/lib/api";

type Vendedor = { id: number; nombre: string };
type CentroCosto = { id: number; nombre: string; codigo?: string };
type Cliente = { id: string; nombre: string };

const fmtCOP = (n: number) =>
  n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

const fmtShort = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n || 0);

const toNum = (v: any) => Number(v || 0);

export default function DashboardFinanciero() {
  const [data, setData] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    subtotal: 0,
    impuestos: 0,
    autorretencion: 0,   // 👈 agregado
    total_facturado: 0,
    retenciones: 0,
    total_utilizable: 0,
    pagado: 0,
    pendiente: 0,
  });
  const [estados, setEstados] = useState<any[]>([]);
  const [topClientes, setTopClientes] = useState<any[]>([]); // 👈 nuevo estado
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filtros
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [clienteSel, setClienteSel] = useState("");
  const [agrupacion, setAgrupacion] = useState<"mes" | "trimestre" | "anio">("mes");

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // KPIs normalizados
  const totalSubtotal = toNum(kpis.subtotal);
  const totalImpuestos = toNum(kpis.impuestos);
  const totalAutorretencion = toNum(kpis.autorretencion); // 👈 ya lo tenemos en el endpoint
  const totalFacturado = toNum(kpis.total_facturado);
  const totalRetenciones = toNum(kpis.retenciones);
  const totalUtilizable = toNum(kpis.total_utilizable);   // 👈 este faltaba
  const totalPagado = toNum(kpis.pagado);
  const totalPendiente = toNum(kpis.pendiente);



  // cargar catálogos
  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const v = await authFetch("/catalogos/vendedores");
        if (Array.isArray(v)) setVendedores(v);
      } catch {}
      try {
        const c = await authFetch("/catalogos/centros-costo");
        if (Array.isArray(c)) setCentros(c);
      } catch {}
      try {
        const qs = new URLSearchParams();
        if (desde) qs.append("desde", desde);
        if (hasta) qs.append("hasta", hasta);

        const cli = await authFetch(`/catalogos/clientes-facturas?${qs.toString()}`);
        if (Array.isArray(cli)) setClientes(cli);
      } catch {}
    };
    loadCatalogos();
  }, [desde, hasta]);

  // cargar facturas + KPIs + serie + top clientes
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      if (desde) qs.append("desde", desde);
      if (hasta) qs.append("hasta", hasta);
      if (sellerId) qs.append("seller_id", sellerId);
      if (costCenter) qs.append("cost_center", costCenter);
      if (clienteSel) qs.append("cliente", clienteSel);
      if (agrupacion) qs.append("agrupacion", agrupacion);

      const url = `/reportes/facturas_enriquecidas?${qs.toString()}`;
      const res = await authFetch(url);

      if (res?.error) {
        setErr(res.error);
      } else {
        setData(res.rows || []);
        if (res.kpis) setKpis(res.kpis);
        if (Array.isArray(res.series)) setSeries(res.series);
        if (Array.isArray(res.estados)) setEstados(res.estados);
        if (Array.isArray(res.top_clientes)) setTopClientes(res.top_clientes); // 👈 guardar top clientes
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Serie temporal
  const monthly = series.map((s: any) => ({
    periodo: s.label,
    subtotal: Number(s.subtotal || 0),
    impuestos: Number(s.impuestos || 0),
    descuentos: Number(s.descuentos || 0),
    total_facturado: Number(s.total_facturado || 0),
    retenciones: Number(s.retenciones || 0),
    total_utilizable: Number(s.total_utilizable || 0),
    pagado: Number(s.pagado || 0),
    pendiente: Number(s.pendiente || 0),
  }));

  // Estados de pago
  const estadosData = estados.map((e: any) => ({
    estado: e.estado,
    valor: Number(e.valor || 0),
  }));

  const pieLabel = (props: any) => {
    const { name, percent } = props;
    return `${name}: ${(percent * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📊 Dashboard Financiero</h2>

      {/* FILTROS */}
      <div className="bg-gray-50 p-4 rounded shadow flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border rounded p-1"
          />
        </div>
        <div>
          <label className="block text-sm">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border rounded p-1"
          />
        </div>
        <div>
          <label className="block text-sm">Vendedor</label>
          <select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre || `ID ${v.id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Centro de costo</label>
          <select
            value={costCenter}
            onChange={(e) => setCostCenter(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">Todos</option>
            {centros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre || `ID ${c.id}`} {c.codigo ? `(${c.codigo})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Cliente</label>
          <select
            value={clienteSel}
            onChange={(e) => setClienteSel(e.target.value)}
            className="border rounded p-1"
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre || `ID ${c.id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Agrupar por</label>
          <select
            value={agrupacion}
            onChange={(e) => setAgrupacion(e.target.value as any)}
            className="border rounded p-1"
          >
            <option value="mes">Mes</option>
            <option value="trimestre" disabled>
              Trimestre
            </option>
            <option value="anio" disabled>
              Año
            </option>
          </select>
        </div>
        <button
          onClick={load}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Aplicar filtros
        </button>
      </div>

      {loading && <p>Cargando datos...</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Ventas netas</p>
              <p className="text-xl font-bold text-green-600">{fmtCOP(totalSubtotal)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Impuestos</p>
              <p className="text-xl font-bold text-yellow-600">{fmtCOP(totalImpuestos)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Retenciones</p>
              <p className="text-xl font-bold text-orange-600">{fmtCOP(totalRetenciones)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Total facturado (Siigo)</p>
              <p className="text-xl font-bold text-emerald-600">{fmtCOP(totalFacturado)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Autorretención</p>
              <p className="text-xl font-bold text-purple-600">{fmtCOP(totalAutorretencion)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Total utilizable</p>
              <p className="text-xl font-bold text-teal-600">{fmtCOP(totalUtilizable)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Pagado</p>
              <p className="text-xl font-bold text-blue-600">{fmtCOP(totalPagado)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow text-center">
              <p className="text-gray-500">Pendiente</p>
              <p className="text-xl font-bold text-red-600">{fmtCOP(totalPendiente)}</p>
            </div>
          </div>



          {/* Evolución temporal */}
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Evolución</h3>
            {monthly.length === 0 ? (
              <div className="text-sm text-gray-500">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis tickFormatter={fmtShort} />
                  <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                  <Legend />
                  <Bar dataKey="subtotal" fill="#16a34a" name="Ventas netas" />
                  <Bar dataKey="total_facturado" fill="#10b981" name="Total facturado" />
                  <Bar dataKey="pagado" fill="#3b82f6" name="Pagado" />
                  <Bar dataKey="pendiente" fill="#dc2626" name="Pendiente" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top clientes + Estados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Top 5 clientes</h3>
              {topClientes.length === 0 ? (
                <div className="text-sm text-gray-500">Sin datos.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topClientes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={fmtShort} />
                    <YAxis dataKey="cliente" type="category" width={200} />
                    <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                    <Bar dataKey="total" fill="#2563eb" name="Ventas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-semibold mb-2">Distribución por estado de pago</h3>
              {estados.length === 0 ? (
                <div className="text-sm text-gray-500">Sin datos.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estadosData}
                    dataKey="valor"
                    nameKey="estado"
                    outerRadius={120}
                    label={pieLabel}
                  >
                    {estadosData.map((entry: any, index: number) => {
                      let color = "#3b82f6"; // azul
                      if (entry.estado === "Pendiente") color = "#dc2626"; // rojo
                      if (entry.estado === "Pagado") color = "#16a34a"; // verde
                      return <Cell key={index} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(v) => fmtCOP(Number(v))} />
                </PieChart>

                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
