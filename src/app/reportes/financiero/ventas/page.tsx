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
  LabelList,
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

/* -------- helpers -------- */
function abreviar(valor: number): string {
  if (valor >= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  if (valor <= 1_000_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (valor <= 1_000_000) return `${(valor / 1_000_000).toFixed(0)}M`;
  if (valor <= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return `${Math.round(valor)}`;
}

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

  // --- Modal detalle ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMes, setModalMes] = useState("");
  const [detalleFacturas, setDetalleFacturas] = useState<any[]>([]);


  // --- Modal Cliente detalle ---
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [clienteEnModal, setClienteEnModal] = useState("");
  const [facturasCliente, setFacturasCliente] = useState([]);

  const handleTopClienteClick = async (entry: any) => {
    if (!entry?.cliente) return;

    setClienteEnModal(entry.cliente);
    setModalClienteOpen(true);

    const qs = new URLSearchParams();
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    if (sellerId) qs.set("seller_id", sellerId);
    if (costCenter) qs.set("cost_center", costCenter);
    qs.set("cliente", entry.cliente);

    const res = await authFetch(`/reportes/facturas_por_cliente?${qs.toString()}`);
    setFacturasCliente(res.rows || []);
  };


  // --- Modal Estado detalle ---
  const [modalEstadoOpen, setModalEstadoOpen] = useState(false);
  const [estadoEnModal, setEstadoEnModal] = useState("");
  const [facturasEstado, setFacturasEstado] = useState([]);

  const handleEstadoClick = async (entry: any) => {
    if (!entry?.estado) return;

    setEstadoEnModal(entry.estado);
    setModalEstadoOpen(true);

    const qs = new URLSearchParams();
    if (desde) qs.set("desde", desde);
    if (hasta) qs.set("hasta", hasta);
    if (sellerId) qs.set("seller_id", sellerId);
    if (costCenter) qs.set("cost_center", costCenter);
    qs.set("estado", entry.estado);

    const res = await authFetch(`/reportes/facturas_por_estado?${qs.toString()}`);
    setFacturasEstado(res.rows || []);
  };


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

  const handleBarClick = async (entry: any) => {
    try {
      const periodo = entry?.periodo;
      if (!periodo) return;

      // Convertir “Jan 2025” → rango del mes
      const dateObj = new Date(periodo);
      if (isNaN(dateObj.getTime())) {
        console.error("Fecha inválida:", periodo);
        return;
      }

      const year = dateObj.getUTCFullYear();
      const month = dateObj.getUTCMonth(); // 0-based

      const desdeMes = `${year}-${String(month + 1).padStart(2, "0")}-01`;

      const hastaMesDate = new Date(Date.UTC(year, month + 1, 0));
      const hastaMes = `${year}-${String(month + 1).padStart(2, "0")}-${String(hastaMesDate.getUTCDate()).padStart(2, "0")}`;


      // Abrir modal mostrando el mes formateado
      setModalMes(periodo);
      setModalOpen(true);

      const qs = new URLSearchParams();
      qs.set("desde", desdeMes);
      qs.set("hasta", hastaMes);

      if (sellerId) qs.set("seller_id", sellerId);
      if (costCenter) qs.set("cost_center", costCenter);
      if (clienteSel) qs.set("cliente", clienteSel);

      const res = await authFetch(`/reportes/facturas_detalle_mes?${qs.toString()}`);
      setDetalleFacturas(res.rows || []);
    } catch (err) {
      console.error("Error cargando detalle por mes", err);
      setDetalleFacturas([]);
    }
  };


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, sellerId, costCenter, clienteSel]);

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

      {/* === MODAL DETALLE FACTURAS === */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white max-w-6xl w-full max-h-[85vh] overflow-y-auto p-6 rounded-lg shadow-lg relative">

            <button
              className="absolute top-2 right-2 text-red-600 text-xl"
              onClick={() => setModalOpen(false)}
            >
              ✖
            </button>

            <h2 className="text-xl font-bold mb-4">
              Facturas del mes: {modalMes}
            </h2>

            <table className="w-full text-sm border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Factura</th>
                  <th className="border p-2">Fecha</th>
                  <th className="border p-2">Cliente</th>
                  <th className="border p-2">Vendedor</th>
                  <th className="border p-2">Centro Costo</th>
                  <th className="border p-2">Subtotal</th>
                  <th className="border p-2">Impuestos</th>
                  <th className="border p-2">Total</th>
                  <th className="border p-2">Pagado</th>
                  <th className="border p-2">Pendiente</th>
                  <th className="border p-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {detalleFacturas.map((f, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-gray-50 ${Number(f.saldo) > 0 ? "text-red-600 font-semibold" : ""}`}
                    >
                    <td className="border p-2">{f.idfactura}</td>
                    <td className="border p-2">{new Date(f.fecha).toLocaleDateString()}</td>
                    <td className="border p-2">{f.cliente_nombre}</td>
                    <td className="border p-2">{f.vendedor_nombre || "—"}</td>
                    <td className="border p-2">{f.centro_costo_nombre || "—"}</td>
                    <td className="border p-2">{fmtCOP(Number(f.subtotal))}</td>
                    <td className="border p-2">{fmtCOP(Number(f.impuestos))}</td>
                    <td className="border p-2">{fmtCOP(Number(f.total))}</td>
                    <td className="border p-2">{fmtCOP(Number(f.pagado))}</td>
                    <td className="border p-2">{fmtCOP(Number(f.saldo))}</td>

                    <td className="border p-2">
                      <a className="text-blue-600 underline" target="_blank" href={f.public_url}>
                        Ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      )}


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
                  <Bar 
                    dataKey="subtotal"
                    fill="#16a34a"
                    name="Ventas netas"
                    onClick={(data) => handleBarClick(data)}
                    >
                    <LabelList 
                      dataKey="subtotal" 
                      position="top" 
                      formatter={(v: any) => abreviar(Number(v))} 
                      style={{ fontSize: 10 }}
                      />
                  </Bar>
                  <Bar 
                    dataKey="total_facturado" 
                    fill="#10b981" 
                    name="Total facturado"
                    onClick={(data) => handleBarClick(data)} 
                    >
                    <LabelList 
                      dataKey="total_facturado" 
                      position="top" 
                      formatter={(v: any) => abreviar(Number(v))} 
                      style={{ fontSize: 10 }}
                      />
                  </Bar>
                  <Bar 
                    dataKey="pagado" 
                    fill="#3b82f6" 
                    name="Pagado"
                    onClick={(data) => handleBarClick(data)}
                    >
                    <LabelList 
                      dataKey="pagado" 
                      position="top" 
                      formatter={(v: any) => abreviar(Number(v))} 
                      style={{ fontSize: 10 }}
                      />
                  </Bar>
                  <Bar 
                    dataKey="pendiente" 
                    fill="#dc2626" 
                    name="Pendiente"
                    onClick={(data) => handleBarClick(data)} 
                    >
                    <LabelList 
                      dataKey="pendiente" 
                      position="top" 
                      formatter={(v: any) => abreviar(Number(v))} 
                      style={{ fontSize: 10 }}
                      />
                  </Bar>
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
                    <Bar 
                      dataKey="total" 
                      fill="#2563eb" 
                      name="Ventas"
                      onClick={(data) => handleTopClienteClick(data)} 
                      >
                      <LabelList 
                        dataKey="total" 
                        position="right" 
                        formatter={(v: any) => abreviar(Number(v))} 
                        style={{ fontSize: 10 }}
                      />
                    </Bar>
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
                    onClick={(data) => handleEstadoClick(data)}
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
