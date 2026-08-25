"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { authFetch, API, getToken } from "@/lib/api";
import { getWhoAmI } from "@/lib/authInfo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Landmark,
  Wallet,
  Scale,
  ShieldCheck,
  Activity,
  BadgeDollarSign,
  Building2,
  Calculator,
  Plus,
  Minus,
  AlertTriangle,
  Eye,
  EyeOff,
  FileBarChart2,
  FileText,
  RefreshCcw,
  Layers3,
  TrendingDown,
  BarChart3,
  HelpCircle,
  Download,
  Sparkles,
  X,
} from "lucide-react";

type BalanceItem = {
  cuenta: string;
  cuenta_padre: string;
  nombre: string;
  seccion: string;
  grupo_balance: string;
  saldo_actual: number;
  saldo_anterior: number | null;
  variacion_abs: number | null;
  variacion_pct: number | null;
};

type BalanceResponse = {
  ok: boolean;
  fechas: {
    fecha_corte: string;
    comparar_con: string | null;
  };
  meta?: {
    modo_comparativo?: boolean;
    comparacion_solicitada?: boolean;
    snapshot_comparativo_existe?: boolean;
    explicacion_filtros?: {
      fecha_corte?: string;
      comparar_con?: string;
    };
    patrimonio?: {
      patrimonio_explicito_total?: number;
      patrimonio_calculado_total?: number;
      patrimonio_total?: number;
      usa_patrimonio_calculado?: boolean;
    };
    activo_no_corriente?: {
      bruto_total?: number;
      contra_total?: number;
      neto_total?: number;
    };
  };
  kpis: {
    activo_corriente: number;
    activo_no_corriente: number;
    activo_no_corriente_bruto?: number;
    activo_no_corriente_contra?: number;
    activos_totales: number;
    pasivo_corriente: number;
    pasivo_no_corriente: number;
    pasivos_totales: number;
    patrimonio_explicito_total?: number;
    patrimonio_calculado_total?: number;
    patrimonio_total: number;
    pasivo_mas_patrimonio: number;
    capital_trabajo: number;
    razon_corriente: number;
    nivel_endeudamiento_pct: number;
    autonomia_financiera_pct: number;
    cuadratura: number;
    cuadratura_original?: number;
    utilidad_calculada_actual?: number;
    utilidad_calculada_anterior?: number | null;
    ajuste_patrimonio_aplicado_actual?: number;
    ajuste_patrimonio_aplicado_anterior?: number | null;
  };
  resumen?: {
    narrativa?: string[];
    alertas?: string[];
    alertas_detalle?: {
      categoria: string;
      titulo: string;
      cantidad: number;
      mensajes: string[];
      items: any[];
    }[];
  };
  balance: {
    activo_corriente: BalanceItem[];
    activo_no_corriente_bruto: BalanceItem[];
    activo_no_corriente_contra: BalanceItem[];
    activo_no_corriente: BalanceItem[];
    pasivo_corriente: BalanceItem[];
    pasivo_no_corriente: BalanceItem[];
    patrimonio_explicito: BalanceItem[];
    patrimonio_calculado: BalanceItem[];
    patrimonio: BalanceItem[];
  };
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getLastDayOfPreviousMonth(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const prevMonthLastDay = new Date(d.getFullYear(), d.getMonth(), 0);
  return prevMonthLastDay.toISOString().slice(0, 10);
}

function formatFechaCorta(fecha?: string | null) {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

const BALANCE_INFO: Record<string, string> = {
  activos_totales:
    "Representa el total de bienes, derechos y recursos controlados por la empresa al corte seleccionado.",
  pasivos_totales:
    "Representa el total de obligaciones con terceros al corte del balance.",
  patrimonio_total:
    "Corresponde a la participación de los propietarios en la empresa después de restar los pasivos a los activos.",
  capital_trabajo:
    "Es la diferencia entre activo corriente y pasivo corriente. Indica el colchón financiero operativo disponible en el corto plazo.",
  razon_corriente:
    "Mide la capacidad de la empresa para cubrir sus obligaciones de corto plazo con sus activos corrientes.",
  nivel_endeudamiento_pct:
    "Mide qué porcentaje de los activos está financiado con deuda. Entre más alto, mayor dependencia de recursos de terceros.",
  autonomia_financiera_pct:
    "Mide qué porcentaje de los activos está respaldado con patrimonio propio. Entre más alto, mayor independencia financiera.",
  cuadratura:
    "Verifica la ecuación contable del balance: Activos = Pasivos + Patrimonio.",
  activo_no_corriente_bruto:
    "Corresponde al valor base de los activos no corrientes antes de depreciaciones, amortizaciones o ajustes acumulados.",
  activo_no_corriente_contra:
    "Corresponde a depreciaciones, amortizaciones y demás contra cuentas que reducen el valor neto del activo no corriente.",
  activo_no_corriente_neto:
    "Es el valor final del activo no corriente después de restar depreciaciones y ajustes acumulados.",
  patrimonio_explicito:
    "Corresponde al patrimonio reportado directamente en cuentas contables de clase 3.",
  patrimonio_calculado:
    "Es el patrimonio complementario o calculado automáticamente por el sistema con base en utilidades acumuladas y ajustes.",
  patrimonio_total_mix:
    "Es la suma del patrimonio explícito reportado y el patrimonio calculado por el sistema cuando aplica.",
};

// Nombres de grupo del PUC colombiano (Decreto 2650 de 1993) a nivel de
// "cuenta mayor" (4 dígitos) - catálogo público estándar, no algo
// específico de un cliente. Se usa para agrupar la cascada del balance
// igual a como lo hace un contador (ej. "Deudores" en vez de listar cada
// subcuenta de clientes por separado). Si un cuenta_padre no aparece acá
// (plan de cuentas personalizado), se usa un fallback con el código.
const PUC_GRUPOS: Record<string, string> = {
  "1105": "Caja", "1110": "Bancos", "1120": "Cuentas de ahorro", "1125": "Fondos",
  "1205": "Acciones", "1215": "Cuotas o partes de interés social",
  "1305": "Clientes", "1310": "Cuentas corrientes comerciales", "1330": "Anticipos y avances",
  "1355": "Anticipo de impuestos y contribuciones", "1360": "Reclamaciones",
  "1365": "Cuentas por cobrar a trabajadores", "1380": "Deudores varios",
  "1405": "Materias primas", "1435": "Mercancías no fabricadas por la empresa", "1440": "Inventario",
  "1504": "Terrenos", "1516": "Construcciones y edificaciones", "1520": "Maquinaria y equipo",
  "1524": "Equipo de oficina", "1528": "Equipo de computación y comunicación",
  "1540": "Flota y equipo de transporte", "1592": "Depreciación acumulada",
  "1605": "Marcas", "1610": "Patentes", "1705": "Gastos pagados por anticipado",
  "1710": "Cargos diferidos", "1905": "Valorizaciones",
  "2105": "Bancos nacionales", "2110": "Bancos del exterior", "2120": "Corporaciones financieras",
  "2195": "Otras obligaciones financieras",
  "2205": "Proveedores nacionales", "2210": "Proveedores del exterior",
  "2335": "Costos y gastos por pagar", "2355": "Deudas con accionistas o socios",
  "2360": "Dividendos o participaciones por pagar", "2365": "Retención en la fuente por pagar",
  "2367": "Impuesto a las ventas retenido", "2368": "Impuesto de industria y comercio retenido",
  "2370": "Acreedores varios / aportes de nómina", "2380": "Acreedores varios",
  "2404": "Impuesto de renta y complementarios por pagar", "2408": "IVA por pagar",
  "2412": "Impuesto de industria y comercio por pagar",
  "2505": "Salarios por pagar", "2510": "Cesantías consolidadas", "2515": "Intereses sobre cesantías",
  "2520": "Prima de servicios", "2525": "Vacaciones consolidadas",
  "2605": "Provisión para obligaciones fiscales", "2610": "Provisión para obligaciones laborales",
  "2705": "Ingresos recibidos por anticipado",
  "2805": "Anticipos y avances recibidos", "2815": "Depósitos recibidos",
  "2820": "Ingresos recibidos para terceros",
  "3105": "Capital suscrito y pagado", "3115": "Aportes sociales",
  "3305": "Reserva legal", "3605": "Utilidad del ejercicio", "3610": "Pérdida del ejercicio",
  "3705": "Utilidades acumuladas", "3710": "Pérdidas acumuladas", "3805": "Superávit por valorizaciones",
};

function nombreGrupoPuc(codigo: string): string {
  return PUC_GRUPOS[codigo] || `Grupo ${codigo}`;
}

function autoFitColumns(ws: XLSX.WorkSheet, rows: any[]) {
  const widths: number[] = [];

  rows.forEach((row) => {
    Object.values(row || {}).forEach((value, idx) => {
      const cellValue = value === null || value === undefined ? "" : String(value);
      widths[idx] = Math.max(widths[idx] || 10, cellValue.length + 2);
    });
  });

  ws["!cols"] = widths.map((w) => ({ wch: Math.min(w, 40) }));
}

function ValueCell({
  value,
  emphasizeNegative = false,
  className = "",
}: {
  value: number | null | undefined;
  emphasizeNegative?: boolean;
  className?: string;
}) {
  const isNegative = (value || 0) < 0;

  return (
    <span
      className={`${isNegative && emphasizeNegative ? "text-red-600" : "text-slate-900"} font-bold ${className}`}
    >
      {formatCurrency(value)}
    </span>
  );
}

function VariacionBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  let cls = "bg-slate-100 text-slate-700";
  if (value > 0) cls = "bg-green-100 text-green-700";
  if (value < 0) cls = "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded-lg text-[11px] font-black ${cls}`}>
      {value > 0 ? "+" : ""}
      {formatNumber(value)}%
    </span>
  );
}

function CuadraturaBadge({ value }: { value: number }) {
  const ok = Math.abs(value) < 1;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-black ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {ok ? "CUADRA" : `NO CUADRA (${formatCurrency(value)})`}
    </span>
  );
}

function ModeBadge({
  comparativo,
  snapshotComparativoExiste,
}: {
  comparativo: boolean;
  snapshotComparativoExiste: boolean;
}) {
  if (comparativo) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
        Modo comparativo
      </span>
    );
  }

  if (!snapshotComparativoExiste) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700">
        Modo simple
      </span>
    );
  }

  return null;
}

function InfoHint({
  text,
  dark = false,
  align = "right",
}: {
  text: string;
  dark?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className="relative group/info inline-flex">
      <button
        type="button"
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-all ${
          dark
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        }`}
        aria-label="Ver explicación"
      >
        <HelpCircle size={11} />
      </button>

      <div
        className={`pointer-events-none absolute top-6 z-50 w-64 rounded-2xl border px-3 py-3 text-[11px] leading-5 shadow-2xl opacity-0 scale-95 transition-all duration-200 group-hover/info:opacity-100 group-hover/info:scale-100 group-focus-within/info:opacity-100 group-focus-within/info:scale-100 ${
          align === "left" ? "left-0" : "right-0"
        } ${
          dark
            ? "border-slate-700 bg-slate-900 text-slate-100"
            : "border-slate-200 bg-white text-slate-700"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function StatCardBalance({
  title,
  value,
  icon,
  color = "slate",
  badge,
  highlight = false,
  description,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "sky" | "indigo" | "slate" | "amber";
  badge?: string;
  highlight?: boolean;
  description: string;
}) {
  const themes: Record<string, string> = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    sky: "text-sky-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
    slate: "text-slate-700 bg-white border-slate-100",
    amber: "text-amber-600 bg-white border-slate-100",
  };

  return (
    <Card
      className={`relative overflow-visible border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
        highlight
          ? "bg-indigo-600 text-white shadow-indigo-200 border-none"
          : themes[color]
      }`}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className={`p-2.5 rounded-2xl ${highlight ? "bg-white/20" : "bg-slate-50"}`}>
            {icon}
          </div>

          <div className="flex items-center gap-1.5">
            {badge && (
              <div
                className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                  highlight
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {badge}
              </div>
            )}

            <InfoHint text={description} dark={highlight} align="right" />
          </div>
        </div>

        <p
          className={`text-[9px] font-black uppercase tracking-widest ${
            highlight ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {title}
        </p>

        <p className="text-[1.9rem] leading-none font-black mt-1 tracking-tighter break-words">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SectionTable({
  title,
  subtitle,
  items,
  showComparison,
  open,
  onToggle,
  fechaActualLabel,
  fechaAnteriorLabel,
}: {
  title: string;
  subtitle?: string;
  items: BalanceItem[];
  showComparison: boolean;
  open: boolean;
  onToggle: () => void;
  fechaActualLabel?: string;
  fechaAnteriorLabel?: string;
}) {
  const labelActual = fechaActualLabel ? `Actual (${fechaActualLabel})` : "Actual";
  const labelAnterior = fechaAnteriorLabel ? `Anterior (${fechaAnteriorLabel})` : "Anterior";
  const totalActual = items.reduce((acc, it) => acc + (it.saldo_actual || 0), 0);
  const totalAnterior = showComparison
    ? items.reduce((acc, it) => acc + (it.saldo_anterior || 0), 0)
    : 0;

  const variacionAbs = showComparison ? totalActual - totalAnterior : null;
  const variacionPct =
    showComparison && totalAnterior !== 0
      ? (variacionAbs! / totalAnterior) * 100
      : showComparison
      ? 0
      : null;

  return (
    <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
      <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center">
        <div>
          <h2 className="font-black text-lg uppercase tracking-widest">{title}</h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">
            {subtitle || "Resumen del grupo y detalle por cuenta"}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-xs font-black hover:bg-white/10 transition-all"
        >
          {open ? <Minus size={15} /> : <Plus size={15} />}
          {open ? "Ocultar" : "Ver detalle"}
        </button>
      </div>

      <CardContent className="p-5">
        <div className="rounded-2xl border bg-slate-50 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 text-sm">
            <div className="p-4 font-black text-slate-700 md:col-span-5">
              Total {title}
            </div>

            <div className="p-4 text-right md:col-span-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                {labelActual}
              </div>
              <ValueCell value={totalActual} emphasizeNegative />
            </div>

            {showComparison && (
              <>
                <div className="p-4 text-right md:col-span-2 border-t md:border-t-0 md:border-l">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    {labelAnterior}
                  </div>
                  <ValueCell value={totalAnterior} emphasizeNegative />
                </div>

                <div className="p-4 text-right md:col-span-1 border-t md:border-t-0 md:border-l">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Var. $
                  </div>
                  {variacionAbs === null ? (
                    "—"
                  ) : (
                    <ValueCell value={variacionAbs} emphasizeNegative />
                  )}
                </div>

                <div className="p-4 text-right md:col-span-1 border-t md:border-t-0 md:border-l">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Var. %
                  </div>
                  <VariacionBadge value={variacionPct} />
                </div>
              </>
            )}
          </div>
        </div>

        {open && (
          <div className="overflow-auto mt-5">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                  <th className="text-left p-3">Cuenta</th>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-right p-3">{labelActual}</th>
                  {showComparison && (
                    <>
                      <th className="text-right p-3">{labelAnterior}</th>
                      <th className="text-right p-3">Variación $</th>
                      <th className="text-right p-3">Variación %</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showComparison ? 6 : 3}
                      className="p-5 text-center text-slate-500"
                    >
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.cuenta}
                      className="border-b hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 font-mono text-xs font-bold whitespace-nowrap text-slate-600">
                        {item.cuenta}
                      </td>
                      <td className="p-3 text-slate-800">{item.nombre}</td>
                      <td className="p-3 text-right">
                        <ValueCell value={item.saldo_actual} emphasizeNegative />
                      </td>

                      {showComparison && (
                        <>
                          <td className="p-3 text-right">
                            <ValueCell value={item.saldo_anterior} emphasizeNegative />
                          </td>
                          <td className="p-3 text-right">
                            {item.variacion_abs === null ? (
                              "—"
                            ) : (
                              <ValueCell value={item.variacion_abs} emphasizeNegative />
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <VariacionBadge value={item.variacion_pct} />
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}

                <tr className="bg-slate-100 font-black">
                  <td className="p-3" colSpan={2}>
                    Total {title}
                  </td>
                  <td className="p-3 text-right">
                    <ValueCell value={totalActual} emphasizeNegative />
                  </td>

                  {showComparison && (
                    <>
                      <td className="p-3 text-right">
                        <ValueCell value={totalAnterior} emphasizeNegative />
                      </td>
                      <td className="p-3 text-right">
                        {variacionAbs === null ? (
                          "—"
                        ) : (
                          <ValueCell value={variacionAbs} emphasizeNegative />
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <VariacionBadge value={variacionPct} />
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Vista principal: una sola tabla en cascada (Activo Corriente + No
// Corriente = Total Activo; Pasivo Corriente + No Corriente = Total
// Pasivo; Patrimonio; Total Pasivo + Patrimonio), igual al formato
// estándar de un estado de situación financiera preparado por un
// contador. Antes esta misma información vivía repartida en 7 tarjetas
// separadas (ver SECCIONES más abajo) - quedan disponibles como detalle
// técnico, pero esta es la lectura principal para un usuario normal.
// Consume exactamente los mismos data.balance / data.kpis que ya usan
// esas 7 tarjetas - funciona igual para clientes Siigo y Alegra, no hay
// nada específico de proveedor acá.
function CascadaBalanceGeneral({
  data,
  cards,
  showComparison,
  fechaActualLabel,
  fechaAnteriorLabel,
}: {
  data: BalanceResponse;
  cards: BalanceResponse["kpis"];
  showComparison: boolean;
  fechaActualLabel?: string;
  fechaAnteriorLabel?: string;
}) {
  const labelActual = fechaActualLabel || "Actual";
  const labelAnterior = fechaAnteriorLabel || "Anterior";

  // Qué grupos PUC están expandidos (clave: "seccion:codigo_grupo"), para
  // poder ver el detalle de cuentas de un grupo puntual sin abrir todos -
  // mismo patrón de botón +/- que ya usamos en Cartera de Clientes.
  const [gruposAbiertos, setGruposAbiertos] = useState<Record<string, boolean>>({});
  const toggleGrupo = (key: string) =>
    setGruposAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));

  const sum = (items: BalanceItem[], key: "saldo_actual" | "saldo_anterior") =>
    items.reduce((acc, it) => acc + (Number(it[key]) || 0), 0);

  // Celda de variación con el valor en $ y, debajo, el % - así se lee de
  // un vistazo qué tan grande fue el cambio, no solo en cuánto sino en qué
  // proporción (lo que muestra cualquier estado comparativo de contador).
  const renderVariacionCelda = (
    valorAbs: number | null | undefined,
    valorPct: number | null | undefined
  ) => {
    if (valorAbs == null) {
      return <span className="text-slate-400">—</span>;
    }
    return (
      <div className="flex flex-col items-end gap-0.5">
        <ValueCell value={valorAbs} emphasizeNegative />
        {valorPct != null && <VariacionBadge value={valorPct} />}
      </div>
    );
  };

  // Agrupa por cuenta_padre (el "grupo" de 4 dígitos del PUC, ej. 1305 =
  // Clientes) en vez de listar cada subcuenta suelta - mismo nivel de
  // detalle que muestra un contador en un estado financiero real.
  const renderGrupo = (seccionKey: string, items: BalanceItem[]) => {
    const grupos = new Map<string, BalanceItem[]>();
    items.forEach((item) => {
      const codigo = item.cuenta_padre || item.cuenta;
      if (!grupos.has(codigo)) grupos.set(codigo, []);
      grupos.get(codigo)!.push(item);
    });

    return Array.from(grupos.entries()).map(([codigo, cuentas]) => {
      const key = `${seccionKey}:${codigo}`;
      const abierto = !!gruposAbiertos[key];
      const totalGrupo = sum(cuentas, "saldo_actual");
      const totalGrupoAnt = sum(cuentas, "saldo_anterior");
      const variacionGrupo = showComparison ? totalGrupo - totalGrupoAnt : null;
      const variacionGrupoPct =
        variacionGrupo == null ? null : totalGrupoAnt !== 0 ? (variacionGrupo / totalGrupoAnt) * 100 : 0;
      const soloUnaCuenta = cuentas.length === 1;

      return (
        <Fragment key={key}>
          <tr className="border-b border-slate-100 hover:bg-slate-50/60">
            <td className="py-2 pl-6 pr-3 text-slate-700">
              <div className="flex items-center gap-2">
                {soloUnaCuenta ? (
                  <span className="w-6" />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGrupo(key)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100"
                    title={abierto ? "Contraer cuentas" : `Ver ${cuentas.length} cuentas`}
                  >
                    {abierto ? "−" : "+"}
                  </button>
                )}
                <div>
                  <div>{soloUnaCuenta ? cuentas[0].nombre : nombreGrupoPuc(codigo)}</div>
                  {!soloUnaCuenta && (
                    <div className="text-[11px] text-slate-400 font-normal">
                      {cuentas.length} cuentas
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="py-2 px-3 text-right">
              <ValueCell value={totalGrupo} emphasizeNegative />
            </td>
            {showComparison && (
              <>
                <td className="py-2 px-3 text-right">
                  <ValueCell value={totalGrupoAnt} emphasizeNegative />
                </td>
                <td className="py-2 px-3 text-right">
                  {renderVariacionCelda(variacionGrupo, variacionGrupoPct)}
                </td>
              </>
            )}
          </tr>

          {abierto &&
            !soloUnaCuenta &&
            cuentas.map((item) => (
              <tr key={item.cuenta} className="border-b border-slate-50 bg-slate-50/40">
                <td className="py-1.5 pl-16 pr-3 text-slate-500 text-[13px]">{item.nombre}</td>
                <td className="py-1.5 px-3 text-right text-[13px]">
                  <ValueCell value={item.saldo_actual} emphasizeNegative />
                </td>
                {showComparison && (
                  <>
                    <td className="py-1.5 px-3 text-right text-[13px]">
                      <ValueCell value={item.saldo_anterior} emphasizeNegative />
                    </td>
                    <td className="py-1.5 px-3 text-right text-[13px]">
                      {renderVariacionCelda(item.variacion_abs, item.variacion_pct)}
                    </td>
                  </>
                )}
              </tr>
            ))}
        </Fragment>
      );
    });
  };

  const renderSubtotal = (label: string, valorActual: number, valorAnterior: number) => {
    const variacion = showComparison ? valorActual - valorAnterior : null;
    const variacionPct =
      variacion == null ? null : valorAnterior !== 0 ? (variacion / valorAnterior) * 100 : 0;
    return (
      <tr className="bg-slate-50 font-bold border-b border-slate-200">
        <td className="py-2 pl-6 pr-3 text-slate-800">{label}</td>
        <td className="py-2 px-3 text-right">
          <ValueCell value={valorActual} emphasizeNegative />
        </td>
        {showComparison && (
          <>
            <td className="py-2 px-3 text-right">
              <ValueCell value={valorAnterior} emphasizeNegative />
            </td>
            <td className="py-2 px-3 text-right">{renderVariacionCelda(variacion, variacionPct)}</td>
          </>
        )}
      </tr>
    );
  };

  const renderSeccionHeader = (label: string) => (
    <tr>
      <td
        colSpan={showComparison ? 4 : 2}
        className="pt-6 pb-1 px-3 text-[11px] font-black uppercase tracking-widest text-slate-400"
      >
        {label}
      </td>
    </tr>
  );

  const renderGranTotal = (
    label: string,
    valorActual: number,
    valorAnterior: number,
    dark = false
  ) => {
    const variacion = showComparison ? valorActual - valorAnterior : null;
    const variacionPct =
      variacion == null ? null : valorAnterior !== 0 ? (variacion / valorAnterior) * 100 : 0;
    return (
      <tr className={dark ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"}>
        <td className="py-3 pl-3 pr-3 font-black uppercase tracking-wide text-sm" colSpan={1}>
          {label}
        </td>
        <td className="py-3 px-3 text-right font-black text-sm">
          {dark ? formatCurrency(valorActual) : <ValueCell value={valorActual} emphasizeNegative />}
        </td>
        {showComparison && (
          <>
            <td className="py-3 px-3 text-right font-black text-sm">
              {dark ? (
                formatCurrency(valorAnterior)
              ) : (
                <ValueCell value={valorAnterior} emphasizeNegative />
              )}
            </td>
            <td className="py-3 px-3 text-right">
              <div className="flex flex-col items-end gap-1">
                <span className="font-black text-sm">
                  {dark ? (
                    formatCurrency(variacion ?? 0)
                  ) : (
                    <ValueCell value={variacion ?? 0} emphasizeNegative />
                  )}
                </span>
                {variacionPct != null && <VariacionBadge value={variacionPct} />}
              </div>
            </td>
          </>
        )}
      </tr>
    );
  };

  const totalActivoCorriente = sum(data.balance.activo_corriente, "saldo_actual");
  const totalActivoCorrienteAnt = sum(data.balance.activo_corriente, "saldo_anterior");
  const totalActivoNoCorriente = sum(data.balance.activo_no_corriente, "saldo_actual");
  const totalActivoNoCorrienteAnt = sum(data.balance.activo_no_corriente, "saldo_anterior");
  const totalPasivoCorriente = sum(data.balance.pasivo_corriente, "saldo_actual");
  const totalPasivoCorrienteAnt = sum(data.balance.pasivo_corriente, "saldo_anterior");
  const totalPasivoNoCorriente = sum(data.balance.pasivo_no_corriente, "saldo_actual");
  const totalPasivoNoCorrienteAnt = sum(data.balance.pasivo_no_corriente, "saldo_anterior");
  const totalPatrimonioAnt = sum(data.balance.patrimonio, "saldo_anterior");

  const totalActivoAnt = totalActivoCorrienteAnt + totalActivoNoCorrienteAnt;
  const totalPasivosAnt = totalPasivoCorrienteAnt + totalPasivoNoCorrienteAnt;
  const totalPasivoMasPatrimonioAnt = totalPasivosAnt + totalPatrimonioAnt;

  return (
    <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
      <div className="bg-slate-900 text-white px-6 py-5">
        <h2 className="font-black text-lg uppercase tracking-widest">
          Estado de Situación Financiera
        </h2>
        <p className="text-slate-400 text-xs mt-1 font-medium">
          {showComparison
            ? `Al ${labelActual} · comparado con el ${labelAnterior}`
            : `Al ${labelActual}`}
        </p>
      </div>

      <CardContent className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                <th className="text-left p-3">Cuenta</th>
                <th className="text-right p-3">{labelActual}</th>
                {showComparison && (
                  <>
                    <th className="text-right p-3">{labelAnterior}</th>
                    <th className="text-right p-3">Variación</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {renderSeccionHeader("Activos")}
              {renderGrupo("activo_corriente", data.balance.activo_corriente)}
              {renderSubtotal("Total Activo Corriente", totalActivoCorriente, totalActivoCorrienteAnt)}
              {data.balance.activo_no_corriente.length > 0 && (
                <>
                  {renderGrupo("activo_no_corriente", data.balance.activo_no_corriente)}
                  {renderSubtotal(
                    "Total Activo No Corriente",
                    totalActivoNoCorriente,
                    totalActivoNoCorrienteAnt
                  )}
                </>
              )}
              {renderGranTotal("Total Activo", cards.activos_totales, totalActivoAnt)}

              {renderSeccionHeader("Pasivos")}
              {renderGrupo("pasivo_corriente", data.balance.pasivo_corriente)}
              {renderSubtotal("Total Pasivo Corriente", totalPasivoCorriente, totalPasivoCorrienteAnt)}
              {data.balance.pasivo_no_corriente.length > 0 && (
                <>
                  {renderGrupo("pasivo_no_corriente", data.balance.pasivo_no_corriente)}
                  {renderSubtotal(
                    "Total Pasivo No Corriente",
                    totalPasivoNoCorriente,
                    totalPasivoNoCorrienteAnt
                  )}
                </>
              )}
              {renderGranTotal("Total Pasivos", cards.pasivos_totales, totalPasivosAnt)}

              {renderSeccionHeader("Patrimonio")}
              {renderGrupo("patrimonio", data.balance.patrimonio)}
              {renderGranTotal("Total Patrimonio", cards.patrimonio_total, totalPatrimonioAnt)}

              {renderGranTotal(
                "Total Pasivo + Patrimonio",
                cards.pasivo_mas_patrimonio,
                totalPasivoMasPatrimonioAnt,
                true
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SoftBreakdownCard({
  title,
  subtitle,
  icon,
  rows,
  description,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: { label: string; value: number; emphasize?: boolean; negativeStyle?: boolean; info?: string }[];
  description: string;
}) {
  return (
    <Card className="rounded-[2rem] shadow-sm border bg-white overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              {icon}
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                {title}
                <InfoHint text={description} align="right" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rows.map((row, idx) => (
            <div key={idx} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {row.label}
                </div>
                {row.info && <InfoHint text={row.info} align="right" />}
              </div>

              <div
                className={`text-2xl font-black tracking-tight ${
                  row.negativeStyle && row.value < 0
                    ? "text-amber-700"
                    : row.emphasize
                    ? "text-indigo-700"
                    : "text-slate-900"
                }`}
              >
                {formatCurrency(row.value)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CollapsibleAlerts({
  alerts,
  open,
  onToggle,
}: {
  alerts: string[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-white/70 border border-amber-100">
            <AlertTriangle size={18} className="text-amber-700" />
          </div>

          <div>
            <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide">
              Alertas y observaciones
            </h3>
            <p className="text-xs text-amber-700 mt-1">
              {alerts.length} observación{alerts.length !== 1 ? "es" : ""} automática
              {alerts.length !== 1 ? "s" : ""}. No siempre implican error.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 text-amber-800 border border-amber-200 text-xs font-black hover:bg-white transition-all"
        >
          {open ? <EyeOff size={15} /> : <Eye size={15} />}
          {open ? "Ocultar" : "Ver detalle"}
        </button>
      </div>

      {open && (
        <CardContent className="px-6 pb-6 pt-0">
          <div className="space-y-2">
            {alerts.map((txt, idx) => (
              <div
                key={idx}
                className="text-sm text-amber-900 bg-white/70 border border-amber-100 rounded-xl px-3 py-2"
              >
                ⚠️ {txt}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function BalanceGeneralPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [fechaCorte, setFechaCorte] = useState(today);
  const [compararCon, setCompararCon] = useState(getLastDayOfPreviousMonth(today));
  const [usarComparacion, setUsarComparacion] = useState(true);

  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proveedorDatos, setProveedorDatos] = useState<"siigo" | "alegra">("siigo");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BalanceResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saldo inicial (Alegra): carga el "Estado de situación financiera" nativo
  // de Alegra como piso de saldos - necesario porque el Libro Diario
  // cargado normalmente solo cubre el año en curso, sin ningún saldo
  // acumulado de años anteriores (ver /alegra/cargar_saldos_iniciales,
  // validado con datos reales de Maslux LED 2026-07-18). Por defecto
  // propone el 31 de diciembre del año anterior al de fechaCorte.
  const [saldoInicialFecha, setSaldoInicialFecha] = useState(
    `${new Date(fechaCorte).getFullYear() - 1}-12-31`
  );
  const [subiendoSaldoInicial, setSubiendoSaldoInicial] = useState(false);
  const saldoInicialFileInputRef = useRef<HTMLInputElement>(null);

  // Balance de Prueba real (Siigo): generar desde la API de Siigo, subir
  // el Excel y usarlo como fuente del snapshot de este corte, en vez de
  // acumular auxiliar_contable. Validado 2026-07-15 contra un estado
  // financiero firmado - reconcilia al centavo.
  const [bpAnio, setBpAnio] = useState<number>(new Date(fechaCorte).getFullYear());
  const [bpMesInicio, setBpMesInicio] = useState<number>(1);
  const [bpMesFin, setBpMesFin] = useState<number>(new Date(fechaCorte).getMonth() + 1);
  const [bpGenerando, setBpGenerando] = useState(false);
  const [bpLinkDescarga, setBpLinkDescarga] = useState<string | null>(null);
  const [bpArchivo, setBpArchivo] = useState<File | null>(null);
  const [bpSubiendo, setBpSubiendo] = useState(false);
  const [bpMensaje, setBpMensaje] = useState<string | null>(null);
  const bpFileInputRef = useRef<HTMLInputElement>(null);

  const [openSections, setOpenSections] = useState({
    activo_no_corriente_bruto: false,
    activo_no_corriente_contra: false,
    patrimonio_explicito: false,
    patrimonio_calculado: false,
  });

  const [openAlertas, setOpenAlertas] = useState(false);
  const [mostrarDetalleTecnico, setMostrarDetalleTecnico] = useState(false);

  // "Analizar con IA" - mismo patron de cache/tope/modal que ya funciona
  // en Estado de Resultados (backend: analisis_ia.py, tipo_reporte
  // "balance_general"). El tope mensual de analisis es compartido entre
  // reportes (uno solo por cliente al mes), por eso el estado se consulta
  // aparte para este reporte pero contra el mismo contador del backend.
  const [nombreCliente, setNombreCliente] = useState<string>("");
  const [analisisIAOpen, setAnalisisIAOpen] = useState(false);
  const [analisisIALoading, setAnalisisIALoading] = useState(false);
  const [analisisIAError, setAnalisisIAError] = useState<string | null>(null);
  const [analisisIATexto, setAnalisisIATexto] = useState<string | null>(null);
  const [analisisIAFuente, setAnalisisIAFuente] = useState<"cache" | "nuevo" | null>(null);
  const [analisisIAUso, setAnalisisIAUso] = useState<{ actual: number; tope: number } | null>(null);
  const [analisisIAPeriodoLabel, setAnalisisIAPeriodoLabel] = useState<string>("");
  const [exportandoWord, setExportandoWord] = useState(false);
  const [analisisIAUsoGlobal, setAnalisisIAUsoGlobal] = useState<{ actual: number; tope: number } | null>(null);
  const [analisisIAHistorial, setAnalisisIAHistorial] = useState<
    { periodo_desde: string; periodo_hasta: string; generado_en: string | null }[]
  >([]);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [confirmGasto, setConfirmGasto] = useState<{ mensaje: string; forzar: boolean } | null>(null);

  useEffect(() => {
    setCompararCon(getLastDayOfPreviousMonth(fechaCorte));
  }, [fechaCorte]);

  const resetCollapsedState = () => {
    setOpenSections({
      activo_no_corriente_bruto: false,
      activo_no_corriente_contra: false,
      patrimonio_explicito: false,
      patrimonio_calculado: false,
    });
    setOpenAlertas(false);
  };

  // Llamada "cruda" de regenerar (sin volver a llamar cargarBalance) - la
  // usan tanto el boton manual "Regenerar snapshot" como el auto-reintento
  // de cargarBalance de abajo. Separada para no encadenar dos llamados a
  // cargarBalance() innecesariamente.
  const rebuildSnapshotRaw = async (fecha: string) => {
    const body: any = { fecha_corte: fecha };
    if (usarComparacion && compararCon) {
      body.comparar_con = compararCon;
    }
    await authFetch("/reportes/balance_general/rebuild_snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const cargarBalance = async (fechaCorteOverride?: string, _reintentado = false) => {
    const fecha = fechaCorteOverride || fechaCorte;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ fecha_corte: fecha });

      if (usarComparacion && compararCon) {
        params.append("comparar_con", compararCon);
      }

      const json = await authFetch(`/reportes/balance_general_v1?${params.toString()}`);
      setData(json);
      resetCollapsedState();
    } catch (err: any) {
      // Un corte que nunca se ha consultado (o que necesita datos mas
      // recientes) no tiene snapshot calculado todavia - en vez de mostrar
      // el error crudo y obligar al usuario a saber que debe presionar
      // "Regenerar snapshot" aparte, se reconstruye solo una vez y se
      // reintenta la consulta automaticamente.
      const esFaltaSnapshot = (err.message || "").includes("No existe snapshot");
      if (esFaltaSnapshot && !_reintentado) {
        try {
          await rebuildSnapshotRaw(fecha);
          await cargarBalance(fechaCorteOverride, true);
          return;
        } catch (err2: any) {
          setError(err2.message || "Error regenerando balance automáticamente");
          setData(null);
          setLoading(false);
          return;
        }
      }
      setError(err.message || "Error cargando balance");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const regenerarSnapshot = async () => {
    try {
      setRebuilding(true);
      setError(null);
      await rebuildSnapshotRaw(fechaCorte);
      await cargarBalance();
    } catch (err: any) {
      setError(err.message || "Error regenerando snapshot");
    } finally {
      setRebuilding(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", file);

    const endpoint =
      proveedorDatos === "alegra"
        ? "/alegra/cargar_libro_diario"
        : "/reportes/cargar_auxiliar";

    try {
      await authFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      // Reconstruye el snapshot del corte actual (no solo relee el cache
      // viejo) - si ya existia un snapshot para esta fecha antes de subir
      // el archivo, cargarBalance() por si solo habria mostrado los
      // numeros de ANTES, sin reflejar lo recien cargado.
      await rebuildSnapshotRaw(fechaCorte);
      await cargarBalance();
      alert("Éxito: se procesó el auxiliar contable y se actualizó el Balance General.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error cargando el auxiliar contable");
      alert("Error cargando el archivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaldoInicialUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!saldoInicialFecha) {
      alert("Indica la fecha de corte del saldo inicial (la fecha 'al' del export de Alegra).");
      if (saldoInicialFileInputRef.current) saldoInicialFileInputRef.current.value = "";
      return;
    }

    setSubiendoSaldoInicial(true);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("fecha_corte_inicial", saldoInicialFecha);

    try {
      const res = await authFetch("/alegra/cargar_saldos_iniciales", {
        method: "POST",
        body: formData,
      });

      // Mismo motivo que en handleFileUpload: forzar reconstruccion, no
      // solo releer un snapshot cacheado de antes de este cargue.
      await rebuildSnapshotRaw(fechaCorte);
      await cargarBalance();
      alert(
        `Éxito: ${res?.cuentas_cargadas ?? 0} cuentas cargadas como saldo inicial al ${saldoInicialFecha} (columna usada: ${res?.columna_usada ?? "?"}).`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error cargando el saldo inicial");
      alert("Error cargando el saldo inicial.");
    } finally {
      setSubiendoSaldoInicial(false);
      if (saldoInicialFileInputRef.current) saldoInicialFileInputRef.current.value = "";
    }
  };

  const generarBalancePrueba = async () => {
    setBpGenerando(true);
    setError(null);
    setBpLinkDescarga(null);
    setBpMensaje(null);

    try {
      const resp = await authFetch("/siigo/balance/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: bpAnio,
          month_start: bpMesInicio,
          month_end: bpMesFin,
          includes_tax_difference: false,
        }),
      });

      if (resp?.file_url) {
        setBpLinkDescarga(resp.file_url);
      } else {
        setError(resp?.error || "No se pudo generar el Balance de Prueba desde Siigo.");
      }
    } catch (err: any) {
      setError(err.message || "Error generando el Balance de Prueba desde Siigo.");
    } finally {
      setBpGenerando(false);
    }
  };

  const subirYUsarBalancePrueba = async () => {
    if (!bpArchivo) {
      alert("Selecciona primero el archivo Excel descargado de Siigo.");
      return;
    }

    setBpSubiendo(true);
    setError(null);
    setBpMensaje(null);

    try {
      const formData = new FormData();
      formData.append("archivo", bpArchivo);
      formData.append("anio", String(bpAnio));
      formData.append("mes_inicio", String(bpMesInicio));
      formData.append("mes_fin", String(bpMesFin));

      const resImport = await authFetch("/importar/balance-excel", {
        method: "POST",
        body: formData,
      });

      if (resImport?.error) {
        setError(resImport.error);
        return;
      }

      const resSnapshot = await authFetch(
        "/reportes/balance_general/rebuild_snapshot_desde_balance_prueba",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodo_anio: bpAnio,
            periodo_mes_inicio: bpMesInicio,
            periodo_mes_fin: bpMesFin,
          }),
        }
      );

      if (!resSnapshot?.ok) {
        setError(resSnapshot?.error || "No se pudo aplicar el Balance de Prueba a este corte.");
        return;
      }

      setBpMensaje(
        `Balance de Prueba aplicado al corte ${resSnapshot.fecha_corte}. Ya puedes consultarlo abajo.`
      );
      setFechaCorte(resSnapshot.fecha_corte);
      await cargarBalance(resSnapshot.fecha_corte);
    } catch (err: any) {
      setError(err.message || "Error subiendo o aplicando el Balance de Prueba.");
    } finally {
      setBpSubiendo(false);
      if (bpFileInputRef.current) bpFileInputRef.current.value = "";
    }
  };

  // Se consulta apenas se entra al reporte, para que el usuario sepa
  // cuántos análisis le quedan y qué cortes ya tiene guardados en caché
  // antes de decidir si generar uno nuevo. Falla en silencio si el
  // cliente no tiene el permiso (403) - no rompe el resto del reporte.
  const cargarEstadoAnalisisIA = async () => {
    try {
      const [estado, hist] = await Promise.all([
        authFetch("/reportes/balance_general_v1/analisis-ia/estado"),
        authFetch("/reportes/balance_general_v1/analisis-ia/historial"),
      ]);
      if (typeof estado?.uso_mensual === "number" && typeof estado?.tope_mensual === "number") {
        setAnalisisIAUsoGlobal({ actual: estado.uso_mensual, tope: estado.tope_mensual });
      }
      setAnalisisIAHistorial(Array.isArray(hist?.historial) ? hist.historial : []);
    } catch {
      // silencioso a propósito - ver comentario arriba
    }
  };

  // fechaCorteParam/compararConParam: se usan solo al reabrir un análisis
  // desde "Ver análisis anteriores", para no depender del estado de los
  // filtros (que en ese momento todavía no se re-renderizó con la fecha
  // clickeada - sería una lectura obsoleta). En el uso normal (botón
  // "Analizar con IA" / "Regenerar") se omiten y toma los filtros activos.
  const ejecutarAnalisisIA = async (
    forzar: boolean,
    fechaCorteParam?: string,
    compararConParam?: string | null
  ) => {
    const fc = fechaCorteParam ?? fechaCorte;
    const cc = compararConParam !== undefined ? compararConParam : usarComparacion ? compararCon : null;

    setAnalisisIAOpen(true);
    setAnalisisIALoading(true);
    setAnalisisIAError(null);

    try {
      const res = await authFetch("/reportes/balance_general_v1/analisis-ia", {
        method: "POST",
        body: JSON.stringify({ fecha_corte: fc, comparar_con: cc, forzar }),
      });
      setAnalisisIATexto(res.analisis ?? "");
      setAnalisisIAFuente(res.fuente ?? null);
      setAnalisisIAPeriodoLabel(
        cc && cc !== fc
          ? `${formatFechaCorta(fc)} vs ${formatFechaCorta(cc)}`
          : formatFechaCorta(fc)
      );
      setAnalisisIAUso(
        typeof res.uso_mensual === "number" && typeof res.tope_mensual === "number"
          ? { actual: res.uso_mensual, tope: res.tope_mensual }
          : null
      );
      // El resultado pudo haber cambiado el cupo usado y/o agregar un
      // corte nuevo al historial - se refresca para que el badge y la
      // lista queden al día sin que el usuario tenga que recargar.
      cargarEstadoAnalisisIA();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No fue posible generar el análisis con IA.";
      setAnalisisIAError(mensaje);
    } finally {
      setAnalisisIALoading(false);
    }
  };

  const solicitarAnalisisIA = (
    forzar = false,
    fechaCorteParam?: string,
    compararConParam?: string | null
  ) => {
    const fc = fechaCorteParam ?? fechaCorte;
    const cc = compararConParam !== undefined ? compararConParam : usarComparacion ? compararCon : null;

    const yaExiste = analisisIAHistorial.some(
      (h) => h.periodo_hasta === fc && h.periodo_desde === (cc ?? fc)
    );
    if (!forzar && yaExiste) {
      ejecutarAnalisisIA(forzar, fc, cc);
      return;
    }

    const restante = analisisIAUsoGlobal
      ? Math.max(analisisIAUsoGlobal.tope - analisisIAUsoGlobal.actual, 0)
      : null;
    const mensaje = forzar
      ? `Regenerar vuelve a redactar el análisis desde cero con IA y consume 1 de tus análisis del mes${restante !== null ? ` (te quedan ${restante})` : ""}.`
      : `Este corte todavía no se ha analizado. Se va a generar un análisis nuevo con IA y va a consumir 1 de tus análisis del mes${restante !== null ? ` (te quedan ${restante})` : ""}.`;
    setConfirmGasto({ mensaje, forzar });
  };

  const handleExportarWord = async () => {
    if (!analisisIATexto) return;
    setExportandoWord(true);
    try {
      // El .docx se genera en el backend (python-docx), igual que en
      // Estado de Resultados - mismo motivo (incompatibilidad de la
      // libreria JS "docx" con Turbopack).
      const res = await fetch(`${API}/reportes/balance_general_v1/analisis-ia/word`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          analisis_markdown: analisisIATexto,
          nombre_cliente: nombreCliente || "Cliente InsightsFlow",
          periodo: analisisIAPeriodoLabel,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analisis_ia_Balance_${(nombreCliente || "cliente").replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("No fue posible generar el Word del análisis.");
    } finally {
      setExportandoWord(false);
    }
  };

  useEffect(() => {
    cargarBalance();
    getWhoAmI().then((me) => {
      if (me?.proveedor_datos) setProveedorDatos(me.proveedor_datos);
      if (me?.cliente?.nombre) setNombreCliente(me.cliente.nombre);
    });
    cargarEstadoAnalisisIA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    if (!data) return null;
    return data.kpis;
  }, [data]);

  const modoComparativo = !!data?.meta?.modo_comparativo;
  const snapshotComparativoExiste = !!data?.meta?.snapshot_comparativo_existe;
  const comparacionSolicitada = !!data?.meta?.comparacion_solicitada;

  const fechaActualLabel = formatFechaCorta(data?.fechas?.fecha_corte || fechaCorte);
  const fechaAnteriorLabel = formatFechaCorta(data?.fechas?.comparar_con || compararCon);

  const patrimonioCalculado = useMemo(() => {
    return !!data?.meta?.patrimonio?.usa_patrimonio_calculado;
  }, [data]);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const activoNoCorrienteBruto =
    data?.meta?.activo_no_corriente?.bruto_total ?? cards?.activo_no_corriente_bruto ?? 0;

  const activoNoCorrienteContra =
    data?.meta?.activo_no_corriente?.contra_total ?? cards?.activo_no_corriente_contra ?? 0;

  const activoNoCorrienteNeto =
    data?.meta?.activo_no_corriente?.neto_total ?? cards?.activo_no_corriente ?? 0;

  const patrimonioExplicitoTotal =
    data?.meta?.patrimonio?.patrimonio_explicito_total ?? cards?.patrimonio_explicito_total ?? 0;

  const patrimonioCalculadoTotal =
    data?.meta?.patrimonio?.patrimonio_calculado_total ?? cards?.patrimonio_calculado_total ?? 0;

  const patrimonioTotal =
    data?.meta?.patrimonio?.patrimonio_total ?? cards?.patrimonio_total ?? 0;

  const exportarExcel = () => {
    if (!data || !cards) {
      alert("No hay información para exportar.");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Totales del corte anterior - se calculan aca mismo (mismo criterio
    // que usa CascadaBalanceGeneral en pantalla: sumar saldo_anterior de
    // las listas netas/blended) porque el backend no expone un objeto
    // "kpis_anterior" aparte, solo saldo_anterior por cuenta.
    const sumaAnterior = (items: BalanceItem[] | undefined) =>
      (items || []).reduce((acc, it) => acc + (Number(it.saldo_anterior) || 0), 0);

    const activoCorrienteAnt = sumaAnterior(data.balance.activo_corriente);
    const activoNoCorrienteNetoAnt = sumaAnterior(data.balance.activo_no_corriente);
    const activosTotalesAnt = activoCorrienteAnt + activoNoCorrienteNetoAnt;
    const pasivoCorrienteAnt = sumaAnterior(data.balance.pasivo_corriente);
    const pasivoNoCorrienteAnt = sumaAnterior(data.balance.pasivo_no_corriente);
    const pasivosTotalesAnt = pasivoCorrienteAnt + pasivoNoCorrienteAnt;
    const patrimonioTotalAnt = sumaAnterior(data.balance.patrimonio);
    const pasivoMasPatrimonioAnt = pasivosTotalesAnt + patrimonioTotalAnt;

    // Fila de KPI con anterior/variación solo si hay modo comparativo y
    // se calculó un valor anterior para ese KPI - evita columnas vacías
    // sin sentido en KPIs que no tienen un "anterior" derivable (razones
    // financieras, cuadratura).
    const filaKpi = (campo: string, actual: number, anterior?: number) => {
      if (!modoComparativo || anterior === undefined) {
        return { Campo: campo, Valor: actual };
      }
      const variacion = actual - anterior;
      return {
        Campo: campo,
        Valor: actual,
        Anterior: anterior,
        Variacion_abs: variacion,
        Variacion_pct: anterior !== 0 ? (variacion / anterior) * 100 : 0,
      };
    };

    const resumenRows = [
      {
        Campo: "Fecha de corte",
        Valor: data.fechas?.fecha_corte || fechaCorte,
      },
      {
        Campo: "Comparar con",
        Valor: data.fechas?.comparar_con || (modoComparativo ? compararCon : "No aplica"),
      },
      {
        Campo: "Modo comparativo",
        Valor: modoComparativo ? "Sí" : "No",
      },
      {
        Campo: "Snapshot comparativo existe",
        Valor: snapshotComparativoExiste ? "Sí" : "No",
      },
      {
        Campo: "Usa patrimonio calculado",
        Valor: patrimonioCalculado ? "Sí" : "No",
      },
      filaKpi("Activo corriente", cards.activo_corriente, activoCorrienteAnt),
      filaKpi("Activo no corriente (neto)", activoNoCorrienteNeto, activoNoCorrienteNetoAnt),
      filaKpi("Activos totales", cards.activos_totales, activosTotalesAnt),
      filaKpi("Pasivo corriente", cards.pasivo_corriente, pasivoCorrienteAnt),
      filaKpi("Pasivo no corriente", cards.pasivo_no_corriente, pasivoNoCorrienteAnt),
      filaKpi("Pasivos totales", cards.pasivos_totales, pasivosTotalesAnt),
      { Campo: "Patrimonio reportado", Valor: patrimonioExplicitoTotal },
      { Campo: "Patrimonio calculado", Valor: patrimonioCalculadoTotal },
      filaKpi("Patrimonio total", patrimonioTotal, patrimonioTotalAnt),
      filaKpi("Pasivo + patrimonio", cards.pasivo_mas_patrimonio, pasivoMasPatrimonioAnt),
      { Campo: "Capital de trabajo", Valor: cards.capital_trabajo },
      { Campo: "Razón corriente", Valor: cards.razon_corriente },
      { Campo: "Nivel de endeudamiento %", Valor: cards.nivel_endeudamiento_pct },
      { Campo: "Autonomía financiera %", Valor: cards.autonomia_financiera_pct },
      { Campo: "Cuadratura", Valor: cards.cuadratura },
    ];

    const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
    autoFitColumns(wsResumen, resumenRows);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    const buildSectionRows = (sectionTitle: string, items: BalanceItem[]) => {
      const rows = items.map((item) => ({
        Seccion: sectionTitle,
        Cuenta: item.cuenta,
        Cuenta_padre: item.cuenta_padre,
        Nombre: item.nombre,
        Seccion_balance: item.seccion,
        Grupo_balance: item.grupo_balance,
        Actual: item.saldo_actual || 0,
        ...(modoComparativo
          ? {
              Anterior: item.saldo_anterior || 0,
              Variacion_abs: item.variacion_abs || 0,
              Variacion_pct: item.variacion_pct || 0,
            }
          : {}),
      }));

      const totalActual = items.reduce((acc, it) => acc + (it.saldo_actual || 0), 0);
      const totalAnterior = items.reduce((acc, it) => acc + (it.saldo_anterior || 0), 0);
      const variacionAbs = totalActual - totalAnterior;
      const variacionPct = totalAnterior !== 0 ? (variacionAbs / totalAnterior) * 100 : 0;

      rows.push({
        Seccion: sectionTitle,
        Cuenta: "TOTAL",
        Cuenta_padre: "",
        Nombre: `Total ${sectionTitle}`,
        Seccion_balance: "",
        Grupo_balance: "",
        Actual: totalActual,
        ...(modoComparativo
          ? {
              Anterior: totalAnterior,
              Variacion_abs: variacionAbs,
              Variacion_pct: variacionPct,
            }
          : {}),
      });

      return rows;
    };

    const buildGrandTotalRow = (label: string, actual: number, anterior: number) => {
      const row: Record<string, string | number> = {
        Seccion: "TOTAL",
        Cuenta: "",
        Cuenta_padre: "",
        Nombre: label,
        Seccion_balance: "",
        Grupo_balance: "",
        Actual: actual,
      };
      if (modoComparativo) {
        const variacion = actual - anterior;
        row.Anterior = anterior;
        row.Variacion_abs = variacion;
        row.Variacion_pct = anterior !== 0 ? (variacion / anterior) * 100 : 0;
      }
      return row;
    };

    // Mismas listas netas/blended que usa la cascada en pantalla (no la
    // descomposición bruto/contra ni explícito/calculado) - para que el
    // Excel exportado sea fiel a lo que el usuario ve como reporte
    // principal, con sus mismas filas de gran total.
    const detalleRows = [
      ...buildSectionRows("Activo Corriente", data.balance.activo_corriente || []),
      ...buildSectionRows("Activo No Corriente", data.balance.activo_no_corriente || []),
      buildGrandTotalRow("TOTAL ACTIVO", cards.activos_totales, activosTotalesAnt),
      ...buildSectionRows("Pasivo Corriente", data.balance.pasivo_corriente || []),
      ...buildSectionRows("Pasivo No Corriente", data.balance.pasivo_no_corriente || []),
      buildGrandTotalRow("TOTAL PASIVOS", cards.pasivos_totales, pasivosTotalesAnt),
      ...buildSectionRows("Patrimonio", data.balance.patrimonio || []),
      buildGrandTotalRow("TOTAL PATRIMONIO", patrimonioTotal, patrimonioTotalAnt),
      buildGrandTotalRow(
        "TOTAL PASIVO + PATRIMONIO",
        cards.pasivo_mas_patrimonio,
        pasivoMasPatrimonioAnt
      ),
    ];

    const wsDetalle = XLSX.utils.json_to_sheet(detalleRows);
    autoFitColumns(wsDetalle, detalleRows);
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle Balance");

    // Desglose técnico (bruto/contra del activo no corriente, explícito/
    // calculado del patrimonio) - aparte de "Detalle Balance", igual que
    // en pantalla quedó detrás de "Ver detalle técnico completo": es
    // información válida pero no la vista principal, no debía mezclarse
    // con las listas netas de arriba.
    const detalleTecnicoRows = [
      ...buildSectionRows("Activo No Corriente Base", data.balance.activo_no_corriente_bruto || []),
      ...buildSectionRows(
        "Depreciaciones y Ajustes Acumulados",
        data.balance.activo_no_corriente_contra || []
      ),
      ...buildSectionRows("Patrimonio Reportado", data.balance.patrimonio_explicito || []),
      ...buildSectionRows("Patrimonio Calculado", data.balance.patrimonio_calculado || []),
    ];

    if (detalleTecnicoRows.length > 0) {
      const wsDetalleTecnico = XLSX.utils.json_to_sheet(detalleTecnicoRows);
      autoFitColumns(wsDetalleTecnico, detalleTecnicoRows);
      XLSX.utils.book_append_sheet(wb, wsDetalleTecnico, "Detalle Tecnico");
    }

    const narrativaRows =
      data.resumen?.narrativa?.map((txt, idx) => ({
        Tipo: "Narrativa",
        Nro: idx + 1,
        Texto: txt,
      })) || [];

    const alertasRows =
      data.resumen?.alertas?.map((txt, idx) => ({
        Tipo: "Alerta",
        Nro: idx + 1,
        Texto: txt,
      })) || [];

    const extrasRows = [...narrativaRows, ...alertasRows];

    if (extrasRows.length > 0) {
      const wsExtras = XLSX.utils.json_to_sheet(extrasRows);
      autoFitColumns(wsExtras, extrasRows);
      XLSX.utils.book_append_sheet(wb, wsExtras, "Narrativa y Alertas");
    }

    const fileName = `balance_general_${fechaCorte}${modoComparativo && compararCon ? `_vs_${compararCon}` : ""}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, fileName);
  };

  return (
    <div id="pagina-balance-general" className="space-y-4 p-5 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Balance General
            <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>

          <p className="text-slate-500 text-xs font-medium mt-1">
            Estado de situación financiera con lectura ejecutiva, alertas y análisis comparativo.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {proveedorDatos === "alegra" && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  {uploading ? (
                    <RefreshCcw className="animate-spin" size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                  {uploading ? "Sincronizando..." : "Sincronizar Auxiliar"}
                </button>

                <div className="flex items-center gap-1.5 bg-white border rounded-2xl px-2 py-1">
                  <input
                    type="date"
                    value={saldoInicialFecha}
                    onChange={(e) => setSaldoInicialFecha(e.target.value)}
                    title="Fecha 'al' del export de Alegra (ej. 31 de diciembre del año anterior)"
                    className="text-xs font-bold border-none focus:outline-none bg-transparent w-[110px]"
                  />
                  <input
                    type="file"
                    ref={saldoInicialFileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleSaldoInicialUpload}
                  />
                  <button
                    onClick={() => saldoInicialFileInputRef.current?.click()}
                    title="Sube el 'Estado de situación financiera' nativo de Alegra al corte indicado, para usarlo como saldo de apertura"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-black hover:bg-emerald-800 transition-all shadow active:scale-95"
                  >
                    {subiendoSaldoInicial ? (
                      <RefreshCcw className="animate-spin" size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                    {subiendoSaldoInicial ? "Cargando..." : "Cargar Saldo Inicial"}
                  </button>
                </div>
              </>
            )}

            <Button
              onClick={exportarExcel}
              disabled={!data || loading}
              variant="outline"
              className="rounded-2xl px-5 py-3 text-xs font-black border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Download size={16} className="mr-2" />
              Excel
            </Button>

            <button
              onClick={() => solicitarAnalisisIA(false)}
              disabled={!data || loading}
              className="flex items-center gap-2 px-4 py-3 bg-violet-50 text-violet-700 rounded-2xl text-xs font-black hover:bg-violet-100 transition-all border border-violet-100 disabled:opacity-50"
            >
              <Sparkles size={16} />
              Analizar con IA
            </button>

            <ModeBadge
              comparativo={modoComparativo}
              snapshotComparativoExiste={snapshotComparativoExiste}
            />

            {patrimonioCalculado && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
                Patrimonio calculado
              </span>
            )}
          </div>

          {proveedorDatos === "alegra" && (
            <p className="text-slate-400 text-[10px] font-semibold italic text-right">
              Ruta Alegra: Contabilidad {" > "} Libro Diario {" > "} Exportar Excel
            </p>
          )}

          {(analisisIAUsoGlobal || analisisIAHistorial.length > 0) && (
            <div className="relative flex items-center gap-3">
              {analisisIAUsoGlobal && (
                <span className="text-[10px] font-bold text-violet-400">
                  <Sparkles size={10} className="inline -mt-0.5 mr-1" />
                  {Math.max(analisisIAUsoGlobal.tope - analisisIAUsoGlobal.actual, 0)}/{analisisIAUsoGlobal.tope} análisis con IA disponibles este mes
                </span>
              )}

              {analisisIAHistorial.length > 0 && (
                <button
                  onClick={() => setHistorialOpen((v) => !v)}
                  className="text-[10px] font-black text-violet-600 hover:text-violet-800 underline decoration-dotted"
                >
                  Ver análisis anteriores ({analisisIAHistorial.length})
                </button>
              )}

              {historialOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setHistorialOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 z-40 w-72 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-black text-slate-700">Análisis ya generados</p>
                      <p className="text-[10px] text-slate-400">Volver a ver uno de estos no gasta cupo del mes.</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {analisisIAHistorial.map((h) => (
                        <button
                          key={`${h.periodo_desde}_${h.periodo_hasta}`}
                          onClick={() => {
                            setHistorialOpen(false);
                            solicitarAnalisisIA(
                              false,
                              h.periodo_hasta,
                              h.periodo_desde !== h.periodo_hasta ? h.periodo_desde : null
                            );
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-violet-50 border-b border-slate-50 last:border-0"
                        >
                          <div className="font-bold text-slate-700">
                            Corte {h.periodo_hasta}
                            {h.periodo_desde !== h.periodo_hasta ? ` vs ${h.periodo_desde}` : ""}
                          </div>
                          {h.generado_en && (
                            <div className="text-[10px] text-slate-400">
                              Generado el {new Date(h.generado_en).toLocaleDateString("es-CO")}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <Card className="rounded-[2rem] border shadow-sm bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col min-w-[220px]">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                  Fecha de corte
                </label>
                <Input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  className="rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="flex flex-col min-w-[220px]">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                  Comparar con
                </label>
                <Input
                  type="date"
                  value={compararCon}
                  onChange={(e) => setCompararCon(e.target.value)}
                  disabled={!usarComparacion}
                  className="rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-[10px] font-black text-white uppercase ml-1 mb-1">
                  .
                </label>
                <Button
                  onClick={() => cargarBalance()}
                  disabled={loading}
                  className="bg-slate-900 text-white rounded-xl px-6 py-2.5 text-xs font-black hover:bg-black"
                >
                  {loading ? "Consultando..." : "Consultar balance"}
                </Button>
              </div>

            </div>

            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-3 border">
              <input
                id="usarComparacion"
                type="checkbox"
                checked={usarComparacion}
                onChange={(e) => setUsarComparacion(e.target.checked)}
              />
              <label htmlFor="usarComparacion" className="text-xs font-bold text-slate-700">
                Comparar contra otro corte
              </label>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 border rounded-2xl p-4 leading-6">
            <div>
              <b>Fecha corte:</b>{" "}
              {data?.meta?.explicacion_filtros?.fecha_corte ||
                "Muestra la situación financiera acumulada hasta esa fecha."}
            </div>
            <div>
              <b>Comparar con:</b>{" "}
              {data?.meta?.explicacion_filtros?.comparar_con ||
                "Permite comparar contra otro corte para analizar variaciones. Se recomienda usar cierres de mes."}
            </div>
            {proveedorDatos === "alegra" && (
              <>
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <b>Sincronizar Auxiliar:</b> carga el Libro Diario (movimientos contables) — se sube
                  cada vez que tengas un período nuevo (ej. cada trimestre).
                </div>
                <div>
                  <b>Cargar Saldo Inicial:</b> carga el "Estado de situación financiera" nativo de
                  Alegra al cierre del período ANTERIOR al primer Libro Diario cargado — es el punto de
                  partida, se sube una sola vez por cliente (o de nuevo solo si quieres mover ese punto
                  de partida más adelante en el tiempo).
                </div>
                <div>
                  <b>Regenerar snapshot desde auxiliar:</b> recalcula el balance del corte seleccionado
                  a partir de lo ya cargado. Normalmente no hace falta usarlo — el sistema lo hace solo
                  cuando consultas un corte nuevo o subes un archivo — pero está disponible por si
                  quieres forzar un refresco manual.
                </div>
              </>
            )}
          </div>

          {comparacionSolicitada && !modoComparativo && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              Se solicitó comparación, pero el sistema está mostrando el balance en modo simple
              porque el snapshot comparativo no existe o no fue regenerado.
            </div>
          )}

          {proveedorDatos === "alegra" && (
            <div className="flex flex-col justify-end items-start gap-1">
              <Button
                onClick={regenerarSnapshot}
                disabled={rebuilding}
                variant="outline"
                className="rounded-xl px-5 py-2.5 text-xs font-black border-slate-200"
              >
                {rebuilding ? "Regenerando..." : "Regenerar snapshot desde auxiliar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BALANCE DE PRUEBA REAL (SIIGO) - antes de la cascada a propósito:
          es el paso de "cargar la fuente de datos" para este corte, tiene
          que ir antes del resultado para que el usuario sepa que primero
          hay que generar/subir el balance. */}
      {proveedorDatos === "siigo" && (
        <Card className="rounded-[2rem] border shadow-sm bg-white">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">
                Balance de Prueba real (Siigo)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Descarga el Balance de Prueba directo de Siigo y úsalo como fuente de este
                corte, en vez de acumular el auxiliar contable cargado a mano. Para comparar
                dos cortes, repite este proceso una vez por cada fecha (ej. cierre 2025 y
                cierre 2024).
              </p>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col w-24">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                  Año
                </label>
                <Input
                  type="number"
                  value={bpAnio}
                  onChange={(e) => setBpAnio(Number(e.target.value))}
                  className="rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="flex flex-col w-24">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                  Mes inicio
                </label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={bpMesInicio}
                  onChange={(e) => setBpMesInicio(Number(e.target.value))}
                  className="rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>

              <div className="flex flex-col w-24">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
                  Mes fin
                </label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={bpMesFin}
                  onChange={(e) => setBpMesFin(Number(e.target.value))}
                  className="rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>

              <Button
                onClick={generarBalancePrueba}
                disabled={bpGenerando}
                variant="outline"
                className="rounded-xl px-5 py-2.5 text-xs font-black border-slate-200"
              >
                {bpGenerando ? "Generando..." : "① Generar desde Siigo"}
              </Button>

              {bpLinkDescarga && (
                <a
                  href={bpLinkDescarga}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-blue-600 underline"
                >
                  Descargar Excel generado
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-3 items-center border-t pt-4">
              <input
                ref={bpFileInputRef}
                type="file"
                accept=".xlsx"
                onChange={(e) => setBpArchivo(e.target.files?.[0] || null)}
                className="text-xs"
              />
              <Button
                onClick={subirYUsarBalancePrueba}
                disabled={bpSubiendo}
                className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-xs font-black hover:bg-black"
              >
                {bpSubiendo ? "Procesando..." : "② Subir y usar para este corte"}
              </Button>
            </div>

            {bpMensaje && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                {bpMensaje}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ESTADO DE SITUACIÓN FINANCIERA (cascada) - lectura principal */}
      {data && cards && (
        <CascadaBalanceGeneral
          data={data}
          cards={cards}
          showComparison={modoComparativo}
          fechaActualLabel={fechaActualLabel}
          fechaAnteriorLabel={fechaAnteriorLabel}
        />
      )}

      {error && (
        <Card className="rounded-[2rem] border-red-200 bg-white">
          <CardContent className="py-4 text-red-700 font-semibold">{error}</CardContent>
        </Card>
      )}

      {/* KPIS PRINCIPALES */}
      {cards && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCardBalance
              title="Activos Totales"
              value={formatCurrency(cards.activos_totales)}
              icon={<Wallet size={18} />}
              color="emerald"
              description={BALANCE_INFO.activos_totales}
            />

            <StatCardBalance
              title="Pasivos Totales"
              value={formatCurrency(cards.pasivos_totales)}
              icon={<Landmark size={18} />}
              color="blue"
              description={BALANCE_INFO.pasivos_totales}
            />

            <StatCardBalance
              title="Patrimonio Total"
              value={formatCurrency(patrimonioTotal)}
              icon={<Building2 size={18} />}
              color="sky"
              badge={patrimonioCalculado ? "MIXTO" : "REPORTADO"}
              description={
                patrimonioCalculado
                  ? BALANCE_INFO.patrimonio_total_mix
                  : BALANCE_INFO.patrimonio_total
              }
            />

            <StatCardBalance
              title="Capital de Trabajo"
              value={formatCurrency(cards.capital_trabajo)}
              icon={<BadgeDollarSign size={18} />}
              color="indigo"
              highlight
              description={BALANCE_INFO.capital_trabajo}
            />
          </div>

          {/* KPIS SECUNDARIOS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCardBalance
              title="Razón Corriente"
              value={formatNumber(cards.razon_corriente)}
              icon={<Scale size={18} />}
              color="slate"
              description={BALANCE_INFO.razon_corriente}
            />

            <StatCardBalance
              title="Endeudamiento"
              value={`${formatNumber(cards.nivel_endeudamiento_pct)}%`}
              icon={<Activity size={18} />}
              color="amber"
              description={BALANCE_INFO.nivel_endeudamiento_pct}
            />

            <StatCardBalance
              title="Autonomía Financiera"
              value={`${formatNumber(cards.autonomia_financiera_pct)}%`}
              icon={<ShieldCheck size={18} />}
              color="blue"
              description={BALANCE_INFO.autonomia_financiera_pct}
            />

            <Card className="rounded-[2rem] border shadow-lg bg-white overflow-visible">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="p-2.5 rounded-2xl bg-slate-50">
                    <Calculator size={18} className="text-slate-700" />
                  </div>
                  <InfoHint text={BALANCE_INFO.cuadratura} align="right" />
                </div>

                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Cuadratura
                </p>

                <div className="mt-2">
                  <CuadraturaBadge value={cards.cuadratura} />
                </div>

                <div className="text-[11px] text-slate-500 leading-5 mt-3">
                  Verifica la ecuación:
                  <br />
                  <b>Activos = Pasivos + Patrimonio</b>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* LECTURA EJECUTIVA */}
      {data?.resumen?.narrativa?.length ? (
        <Card className="rounded-[2rem] shadow-sm border bg-white overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-5 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10">
              <FileBarChart2 size={18} className="text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Lectura ejecutiva
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Interpretación automática del estado de situación financiera.
              </p>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="bg-slate-50 border rounded-2xl p-4 space-y-2">
              {data.resumen.narrativa.map((txt, idx) => (
                <div key={idx} className="text-sm text-slate-800 leading-6">
                  • {txt}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ALERTAS */}
      {data?.resumen?.alertas?.length ? (
        <CollapsibleAlerts
          alerts={data.resumen.alertas}
          open={openAlertas}
          onToggle={() => setOpenAlertas((prev) => !prev)}
        />
      ) : null}

      {/* DETALLE TÉCNICO: desgloses (patrimonio reportado vs. calculado,
          activo no corriente bruto/contra) y las 7 tarjetas por cuenta -
          antes era lo primero que veía el usuario; ahora queda como
          contenido secundario, colapsado, para quien quiera auditar el
          detalle o entender cómo se armó cada número de la cascada. */}
      {data && (
        <button
          type="button"
          onClick={() => setMostrarDetalleTecnico((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 rounded-[2rem] border bg-white px-6 py-4 shadow-sm hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <Layers3 size={18} className="text-slate-700" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-700">Ver detalle técnico completo</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Desglose de patrimonio reportado vs. calculado, activo no corriente bruto/contra, y el detalle por cuenta de cada grupo.
              </p>
            </div>
          </div>
          {mostrarDetalleTecnico ? <Minus size={18} className="text-slate-400 shrink-0" /> : <Plus size={18} className="text-slate-400 shrink-0" />}
        </button>
      )}

      {mostrarDetalleTecnico && (
      <>
      {/* DESGLOSES */}
      {cards && (
        <Card className="rounded-[2rem] shadow-sm border bg-white">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <Layers3 size={18} className="text-slate-700" />
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Desgloses técnicos del balance
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Componentes contables complementarios para entender mejor el activo no corriente y el patrimonio.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <SoftBreakdownCard
                title="Activo No Corriente Neto"
                subtitle="Separación entre activo base, depreciaciones/ajustes acumulados y neto final."
                icon={<TrendingDown size={18} className="text-blue-700" />}
                description={BALANCE_INFO.activo_no_corriente_neto}
                rows={[
                  {
                    label: "Activo no corriente base",
                    value: activoNoCorrienteBruto,
                    info: BALANCE_INFO.activo_no_corriente_bruto,
                  },
                  {
                    label: "Depreciaciones / ajustes acumulados",
                    value: activoNoCorrienteContra,
                    negativeStyle: true,
                    info: BALANCE_INFO.activo_no_corriente_contra,
                  },
                  {
                    label: "Activo no corriente neto",
                    value: activoNoCorrienteNeto,
                    emphasize: true,
                    info: BALANCE_INFO.activo_no_corriente_neto,
                  },
                ]}
              />

              <SoftBreakdownCard
                title="Desglose de Patrimonio"
                subtitle="Diferencia entre patrimonio reportado explícitamente y patrimonio calculado por el sistema."
                icon={<BarChart3 size={18} className="text-emerald-700" />}
                description={BALANCE_INFO.patrimonio_total_mix}
                rows={[
                  {
                    label: "Patrimonio reportado",
                    value: patrimonioExplicitoTotal,
                    info: BALANCE_INFO.patrimonio_explicito,
                  },
                  {
                    label: "Patrimonio calculado",
                    value: patrimonioCalculadoTotal,
                    info: BALANCE_INFO.patrimonio_calculado,
                  },
                  {
                    label: "Patrimonio total",
                    value: patrimonioTotal,
                    emphasize: true,
                    info: BALANCE_INFO.patrimonio_total_mix,
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECCIONES - solo las que muestran algo que la cascada NO expone
          (la descomposición bruto/contra del activo no corriente, y
          reportado/calculado del patrimonio). Activo Corriente, Pasivo
          Corriente y Pasivo No Corriente se quitaron: son exactamente los
          mismos data.balance.* que ya muestra la cascada de arriba
          (con el +/- por grupo PUC), mostrarlos dos veces era ruido. */}
      {data && (
        <div className="space-y-4">
          <SectionTable
            title="Activo No Corriente Base"
            subtitle="Activos no corrientes antes de depreciaciones, amortizaciones o ajustes contra activo."
            items={data.balance.activo_no_corriente_bruto}
            showComparison={modoComparativo}
            open={openSections.activo_no_corriente_bruto}
            onToggle={() => toggleSection("activo_no_corriente_bruto")}
          fechaActualLabel={fechaActualLabel}
          fechaAnteriorLabel={fechaAnteriorLabel}
          />

          <SectionTable
            title="Depreciaciones y Ajustes Acumulados"
            subtitle="Contra cuentas del activo no corriente que reducen el valor neto presentado."
            items={data.balance.activo_no_corriente_contra}
            showComparison={modoComparativo}
            open={openSections.activo_no_corriente_contra}
            onToggle={() => toggleSection("activo_no_corriente_contra")}
          fechaActualLabel={fechaActualLabel}
          fechaAnteriorLabel={fechaAnteriorLabel}
          />

          <SectionTable
            title="Patrimonio Reportado"
            subtitle="Cuentas explícitas clase 3 encontradas en el snapshot."
            items={data.balance.patrimonio_explicito}
            showComparison={modoComparativo}
            open={openSections.patrimonio_explicito}
            onToggle={() => toggleSection("patrimonio_explicito")}
          fechaActualLabel={fechaActualLabel}
          fechaAnteriorLabel={fechaAnteriorLabel}
          />

          <SectionTable
            title="Patrimonio Calculado"
            subtitle="Resultado acumulado y ajustes automáticos aplicados por el sistema."
            items={data.balance.patrimonio_calculado}
            showComparison={modoComparativo}
            open={openSections.patrimonio_calculado}
            onToggle={() => toggleSection("patrimonio_calculado")}
          fechaActualLabel={fechaActualLabel}
          fechaAnteriorLabel={fechaAnteriorLabel}
          />
        </div>
      )}
      </>
      )}

      {analisisIAOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4 print:hidden">
          {/* Sin cierre por clic afuera a propósito - mismo motivo que en
              Estado de Resultados: con resize:both, soltar un arrastre de
              redimensionado se puede interpretar como clic sobre el fondo
              y cerrar el modal justo al agrandarlo. */}
          <div
            className="relative flex flex-col rounded-[2rem] bg-white shadow-2xl overflow-auto"
            style={{
              width: "min(96vw, 1100px)",
              height: "min(92vh, 900px)",
              minWidth: "480px",
              minHeight: "420px",
              maxWidth: "98vw",
              maxHeight: "96vh",
              resize: "both",
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Análisis con IA</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {analisisIAPeriodoLabel}
                    {analisisIAFuente === "cache" && " · desde caché (sin cambios desde el último análisis)"}
                    {analisisIAFuente === "nuevo" && " · análisis nuevo"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnalisisIAOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex-1">
              {analisisIALoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                  <RefreshCcw className="animate-spin" size={24} />
                  <p className="text-xs font-bold">Analizando el corte seleccionado…</p>
                </div>
              )}

              {!analisisIALoading && analisisIAError && (
                <div className="border border-rose-200 bg-rose-50 rounded-2xl p-4 text-sm text-rose-700 font-medium">
                  {analisisIAError}
                </div>
              )}

              {!analisisIALoading && !analisisIAError && analisisIATexto && (
                <>
                  {analisisIAFuente === "nuevo" && (
                    <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                      <Sparkles size={14} className="mt-0.5 shrink-0" />
                      <span>
                        Este análisis se generó de nuevo (los datos del período cambiaron desde la última
                        vez, no salió del caché) y consumió 1 de tus análisis del mes.
                      </span>
                    </div>
                  )}
                  <div className="prose prose-sm prose-slate max-w-none prose-headings:font-black prose-h2:text-base prose-h3:text-sm prose-table:text-xs prose-th:whitespace-nowrap prose-td:whitespace-nowrap">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="overflow-x-auto">
                            <table>{children}</table>
                          </div>
                        ),
                      }}
                    >
                      {analisisIATexto}
                    </ReactMarkdown>
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white rounded-b-[2rem]">
              <p className="text-[11px] text-slate-400 font-medium">
                {analisisIAUso
                  ? `${analisisIAUso.actual}/${analisisIAUso.tope} análisis usados este mes`
                  : ""}
              </p>
              {!analisisIALoading && !analisisIAError && analisisIATexto && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const tituloOriginal = document.title;
                      document.title = `analisis_ia_Balance_${(nombreCliente || "cliente").replace(/\s+/g, "_")}`;
                      window.print();
                      document.title = tituloOriginal;
                    }}
                    className="text-xs font-black text-slate-500 hover:text-slate-700"
                  >
                    Imprimir
                  </button>
                  <button
                    onClick={handleExportarWord}
                    disabled={exportandoWord}
                    className="text-xs font-black text-slate-500 hover:text-slate-700 disabled:opacity-50"
                  >
                    {exportandoWord ? "Generando…" : "Exportar a Word"}
                  </button>
                  <button
                    onClick={() => solicitarAnalisisIA(true)}
                    className="text-xs font-black text-violet-700 hover:text-violet-900"
                  >
                    Regenerar análisis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmGasto && (
        <div
          className="fixed inset-0 z-[110] bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setConfirmGasto(null)}
        >
          <div
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3">
              <Sparkles size={18} />
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1">Vas a generar un análisis nuevo</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">{confirmGasto.mensaje}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmGasto(null)}
                className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { forzar } = confirmGasto;
                  setConfirmGasto(null);
                  ejecutarAnalisisIA(forzar);
                }}
                className="px-4 py-2 bg-violet-700 text-white rounded-xl text-xs font-black hover:bg-violet-800"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Área imprimible: vive fuera del modal a propósito - mismo motivo
          que en Estado de Resultados (el modal tiene overflow/resize
          propio que rompe la paginación de impresión). */}
      {analisisIATexto && (
        <div id="analisis-ia-print-area" style={{ position: "absolute", top: "-9999px", left: 0, width: "800px" }}>
          <div className="mb-4 pb-3 border-b border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/insightsflow-logo.png" alt="InsightsFlow" className="h-8 w-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">{nombreCliente || "Cliente InsightsFlow"}</div>
            <div className="text-xs text-slate-400">Balance General · {analisisIAPeriodoLabel}</div>
          </div>

          <div className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{analisisIATexto}</ReactMarkdown>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 italic">
            Reporte generado por la IA de InsightsFlow {new Date().getFullYear()}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          /* display:none (no visibility:hidden) en todo lo demás - un
             elemento visibility:hidden sigue ocupando su espacio en el
             flujo del documento, lo que generaba páginas en blanco extra
             después del contenido real del análisis. */
          #pagina-balance-general > *:not(#analisis-ia-print-area) {
            display: none !important;
          }
          #analisis-ia-print-area {
            position: static !important;
            width: 100% !important;
          }
          /* Cuando una tabla del análisis se parte entre dos hojas, que
             el encabezado se repita en la hoja siguiente - sin esto, la
             continuación de una tabla larga (ej. la de patrimonio) arranca
             con solo números, sin decir qué es cada columna. */
          #analisis-ia-print-area table thead {
            display: table-header-group;
          }
          #analisis-ia-print-area table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}