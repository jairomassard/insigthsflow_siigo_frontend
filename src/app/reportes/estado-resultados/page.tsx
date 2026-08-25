"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch, API, getToken } from "@/lib/api";
import { getWhoAmI } from "@/lib/authInfo";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  TrendingUp,
  FileText,
  RefreshCcw,
  DollarSign,
  Activity,
  Table as TableIcon,
  Landmark,
  Download,
  Eye,
  EyeOff,
  Plus,
  Minus,
  HelpCircle,
  Sparkles,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// =========================================================
// TIPOS
// =========================================================
type EvolucionItem = {
  label: string;
  ingresos?: number;
  ingresos_totales?: number;
  costos_gastos?: number;
  utilidad_bruta?: number;
  utilidad_operativa?: number;
  ebitda?: number;
  utilidad_neta?: number;
  margen_bruto?: number;
  margen_operativo?: number;
  margen_ebitda?: number;
  margen_neto?: number;
  gastos_operacionales?: number;
  impuestos_operativos?: number;
  utilidad_antes_impuestos?: number;
};

type CuentaItem = {
  cuenta: string;
  cuenta_padre?: string;
  nombre: string;
  seccion?: string;
  clase?: string;
  naturaleza?: string;
  valores_mes: Record<string, number>;
  total: number;
  es_impuesto_operativo?: boolean;
};

type Kpis = {
  ingresos_totales?: number;
  ingresos_operacionales?: number;
  ingresos_no_operacionales?: number;
  utilidad_bruta?: number;
  utilidad_operativa?: number;
  ebitda?: number;
  utilidad_neta?: number;
  margen_bruto?: number;
  margen_operativo?: number;
  margen_ebitda?: number;
  margen_neto?: number;
  gastos_operacionales?: number;
  impuestos_operativos?: number;
  utilidad_antes_impuestos?: number;
};

type CuentaSinCodigo = { cuenta_nombre: string; monto: number; n_filas: number };

type Cobertura = {
  pct_cobertura: number;
  monto_codificado: number;
  monto_sin_codigo: number;
  detalle_cuentas_existentes: CuentaSinCodigo[];
  detalle_cuentas_no_existentes: CuentaSinCodigo[];
};

type SectionKey =
  | "ingOp"
  | "costos"
  | "gasOp"
  | "ingNoOp"
  | "gasNoOp";

type ModoVisual = "gerencial" | "auditoria";

// =========================================================
// HELPERS
// =========================================================

function abreviar(valor: number): string {
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

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatPercent = (val?: number) => `${(val ?? 0).toFixed(2)}%`;

const formatSignedCurrency = (val: number) => {
  const abs = Math.abs(val || 0);
  const formatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(abs);

  return val < 0 ? `-${formatted}` : formatted;
};

const normalizeDisplayValue = (
  val: number,
  modo: ModoVisual,
  isGasto: boolean
) => {
  if (modo === "gerencial" && isGasto) return Math.abs(val || 0);
  return val || 0;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-2xl border rounded-xl border-slate-200 z-50">
        <p className="font-bold text-slate-800 mb-2 border-b pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm font-bold flex justify-between gap-4"
            style={{ color: entry.color }}
          >
            <span>{entry.name}:</span>
            <span>{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Etiqueta para barras: más cerca del tope
const BarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="#475569"
      fontSize={10}
      fontWeight="900"
      textAnchor="middle"
    >
      {abreviar(value)}
    </text>
  );
};

// Etiqueta para línea EBITDA
const LineLabel = (props: any) => {
  const { x, y, value } = props;
  if (!value || value === 0) return null;

  return (
    <text
      x={x}
      y={y - 12}
      fill="#475569"
      fontSize={10}
      fontWeight="900"
      textAnchor="middle"
    >
      {abreviar(value)}
    </text>
  );
};

function getCuentaPrefix(cuenta?: string, length = 2) {
  return String(cuenta || "").slice(0, length);
}

function matchCuenta(
  cuenta: CuentaItem,
  seccionEsperada: string,
  fallback: (c: CuentaItem) => boolean
) {
  return cuenta.seccion ? cuenta.seccion === seccionEsperada : fallback(cuenta);
}
function porcentajeCambio(actual: number, anterior: number) {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function absPercent(part: number, total: number) {
  if (!total) return 0;
  return (Math.abs(part) / Math.abs(total)) * 100;
}

function tendenciaTexto(
  actual: number,
  anterior: number,
  labelUp = "aumentó",
  labelDown = "disminuyó"
) {
  if (actual > anterior) return labelUp;
  if (actual < anterior) return labelDown;
  return "se mantuvo estable";
}

function formatDeltaCurrency(actual: number, anterior: number) {
  const delta = (actual || 0) - (anterior || 0);
  return `${delta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(delta))}`;
}

function formatDeltaPercent(actual: number, anterior: number) {
  const pct = porcentajeCambio(actual || 0, anterior || 0);
  if (pct === null) return "N/A";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

const KPI_INFO = {
  ingresosTotales: {
    title: "Ingresos Totales",
    description:
      "Suma de ingresos operacionales (venta o prestación del servicio) más ingresos no operacionales (financieros, otros ingresos), antes de restar costos, gastos e impuestos.",
  },
  utilidadBruta: {
    title: "Utilidad Bruta",
    description:
      "Es la ganancia que queda después de restar a los ingresos los costos directamente asociados a la venta o prestación del servicio. Mide qué tan rentable es la operación principal antes de gastos administrativos y comerciales.",
    marginDescription:
      "Margen Bruto: indica qué porcentaje de los ingresos se convierte en utilidad bruta. Entre más alto, mayor eficiencia en costos directos.",
  },
  utilidadOperativa: {
    title: "Utilidad Operativa",
    description:
      "Es la utilidad que queda luego de restar a la utilidad bruta los gastos operacionales. Refleja el resultado del negocio en su operación normal, sin considerar partidas no operacionales.",
    marginDescription:
      "Margen Operativo: muestra qué porcentaje de los ingresos queda como utilidad operativa después de cubrir costos y gastos del negocio.",
  },
  ebitda: {
    title: "EBITDA",
    description:
      "Corresponde a la utilidad antes de intereses, impuestos, depreciaciones y amortizaciones. Se usa para medir la capacidad operativa real del negocio y comparar desempeño entre empresas.",
    marginDescription:
      "Margen EBITDA: muestra qué porcentaje de los ingresos se convierte en EBITDA. Es útil para analizar la generación operativa de caja del negocio.",
  },
  utilidadNeta: {
    title: "Utilidad Neta",
    description:
      "Es el resultado final del período después de considerar costos, gastos operacionales y partidas no operacionales. Indica la ganancia o pérdida definitiva del negocio.",
    marginDescription:
      "Margen Neto: representa qué porcentaje de los ingresos termina como utilidad final para la empresa.",
  },
};

// =========================================================
// PAGE
// =========================================================
export default function EstadoResultadosPage() {
  useAuthGuard();

  // Si se llega desde otro reporte (ej. "Ver Estado de Resultados" del
  // Resumen Ejecutivo) con ?desde=&hasta= en la URL, arranca con ESE
  // período en vez del default - así el usuario no pierde coherencia
  // viendo un número distinto al que acababa de mirar en el reporte de
  // origen.
  const searchParams = useSearchParams();

  const [evolucionApi, setEvolucionApi] = useState<EvolucionItem[]>([]);
  const [composicion, setComposicion] = useState<CuentaItem[]>([]);
  const [kpisApi, setKpisApi] = useState<Kpis>({});
  const [cobertura, setCobertura] = useState<Cobertura | null>(null);
  const [mostrarDetalleCobertura, setMostrarDetalleCobertura] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(() => searchParams.get("desde") || "2026-01-01");
  const [fechaHasta, setFechaHasta] = useState(() => searchParams.get("hasta") || "2026-12-31");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analisisIAOpen, setAnalisisIAOpen] = useState(false);
  const [analisisIALoading, setAnalisisIALoading] = useState(false);
  const [analisisIAError, setAnalisisIAError] = useState<string | null>(null);
  const [analisisIATexto, setAnalisisIATexto] = useState<string | null>(null);
  const [analisisIAFuente, setAnalisisIAFuente] = useState<"cache" | "nuevo" | null>(null);
  const [analisisIAUso, setAnalisisIAUso] = useState<{ actual: number; tope: number } | null>(null);
  const [nombreCliente, setNombreCliente] = useState<string>("");
  const [exportandoWord, setExportandoWord] = useState(false);
  const [analisisIAUsoGlobal, setAnalisisIAUsoGlobal] = useState<{ actual: number; tope: number } | null>(null);
  const [analisisIAHistorial, setAnalisisIAHistorial] = useState<
    { periodo_desde: string; periodo_hasta: string; generado_en: string | null }[]
  >([]);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [proveedorDatos, setProveedorDatos] = useState<"siigo" | "alegra">("siigo");
  // Solo aplica para clientes Alegra: Alegra agrupa "Gastos por Impuestos"
  // (ICA/Industria y Comercio, cuenta PUC 5115) despues de "Utilidad Antes
  // de Impuestos" en su propio reporte nativo, mientras que la practica
  // contable correcta (PUC/NIIF) es tratarlo como gasto operacional -
  // que es lo que este sistema calcula por defecto. La Utilidad Neta final
  // es identica en ambos modos, solo cambia donde se resta en la cascada.
  const [modoAlegraNativo, setModoAlegraNativo] = useState(false);
  const [vista, setVista] = useState<"resumida" | "detallada">("detallada");
  const [modoVisual, setModoVisual] = useState<ModoVisual>("gerencial");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    ingOp: false,
    costos: false,
    gasOp: false,
    ingNoOp: false,
    gasNoOp: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAllSections = () => {
    setOpenSections({
      ingOp: true,
      costos: true,
      gasOp: true,
      ingNoOp: true,
      gasNoOp: true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      ingOp: false,
      costos: false,
      gasOp: false,
      ingNoOp: false,
      gasNoOp: false,
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/reportes/pnl_v1?desde=${fechaDesde}&hasta=${fechaHasta}`
      );
      setEvolucionApi(res.evolucion ?? []);
      setComposicion(res.composicion ?? []);
      setKpisApi(res.kpis ?? {});
      setCobertura(res.cobertura ?? null);
    } catch (err) {
      console.error(err);
      alert("No fue posible cargar el Estado de Resultados.");
    } finally {
      setLoading(false);
    }
  };

  // Se consulta apenas se entra al reporte (no solo después de generar) -
  // para que el usuario sepa cuántos análisis le quedan y qué períodos ya
  // tiene guardados en caché ANTES de decidir si generar uno nuevo.
  // Falla en silencio si el cliente no tiene el permiso (403) - simplemente
  // no se muestra el badge, no rompe el resto del reporte.
  const cargarEstadoAnalisisIA = async () => {
    try {
      const [estado, hist] = await Promise.all([
        authFetch("/reportes/pnl_v1/analisis-ia/estado"),
        authFetch("/reportes/pnl_v1/analisis-ia/historial"),
      ]);
      if (typeof estado?.uso_mensual === "number" && typeof estado?.tope_mensual === "number") {
        setAnalisisIAUsoGlobal({ actual: estado.uso_mensual, tope: estado.tope_mensual });
      }
      setAnalisisIAHistorial(Array.isArray(hist?.historial) ? hist.historial : []);
    } catch {
      // silencioso a propósito - ver comentario arriba
    }
  };

  // Modal propio de confirmación (en vez de window.confirm, que no se
  // puede estilizar y se ve como un cuadro del navegador). Se dispara
  // ANTES de gastar cupo, en los dos casos donde ya sabemos con certeza
  // que la llamada va a costar: "Regenerar" (siempre salta el caché, ver
  // comentario en analisis_ia.py) y un período que todavía no aparece en
  // el historial (nunca se generó, así que no puede salir del caché). Si
  // el período SÍ está en el historial, no se pregunta nada - lo normal
  // es que salga gratis del caché, y si algo cambió por dentro el
  // usuario lo ve igual reflejado como "análisis nuevo" en el modal.
  const [confirmGasto, setConfirmGasto] = useState<
    { mensaje: string; forzar: boolean; fechaDesde: string; fechaHasta: string } | null
  >(null);

  // fechaDesdeParam/fechaHastaParam: se usan solo al reabrir un análisis
  // desde "Ver análisis anteriores". Sin esto, el click dispara
  // setFechaDesde/setFechaHasta (que no aplican hasta el próximo render)
  // y de inmediato lee fechaDesde/fechaHasta del closure actual - que
  // todavía tiene el período VIEJO. Resultado: se re-analizaba el período
  // que estaba en pantalla antes del click, no el que se acababa de
  // clickear en el historial. Pasar el override explícito evita depender
  // de un estado que aún no se re-renderizó.
  const ejecutarAnalisisIA = async (
    forzar: boolean,
    fechaDesdeParam?: string,
    fechaHastaParam?: string
  ) => {
    const fd = fechaDesdeParam ?? fechaDesde;
    const fh = fechaHastaParam ?? fechaHasta;

    setAnalisisIAOpen(true);
    setAnalisisIALoading(true);
    setAnalisisIAError(null);

    try {
      const res = await authFetch("/reportes/pnl_v1/analisis-ia", {
        method: "POST",
        body: JSON.stringify({ desde: fd, hasta: fh, forzar }),
      });
      setAnalisisIATexto(res.analisis ?? "");
      setAnalisisIAFuente(res.fuente ?? null);
      setAnalisisIAUso(
        typeof res.uso_mensual === "number" && typeof res.tope_mensual === "number"
          ? { actual: res.uso_mensual, tope: res.tope_mensual }
          : null
      );
      // El resultado pudo haber cambiado el cupo usado y/o agregar un
      // período nuevo al historial - se refresca para que el badge y la
      // lista queden al día sin que el usuario tenga que recargar.
      cargarEstadoAnalisisIA();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No fue posible generar el análisis con IA.";
      setAnalisisIAError(mensaje);
    } finally {
      setAnalisisIALoading(false);
    }
  };

  const solicitarAnalisisIA = async (
    forzar = false,
    fechaDesdeParam?: string,
    fechaHastaParam?: string
  ) => {
    const fd = fechaDesdeParam ?? fechaDesde;
    const fh = fechaHastaParam ?? fechaHasta;

    const restante = analisisIAUsoGlobal
      ? Math.max(analisisIAUsoGlobal.tope - analisisIAUsoGlobal.actual, 0)
      : null;
    const sufijoRestante = restante !== null ? ` (te quedan ${restante})` : "";

    if (forzar) {
      setConfirmGasto({
        mensaje: `Regenerar vuelve a redactar el análisis desde cero con IA y consume 1 de tus análisis del mes${sufijoRestante}.`,
        forzar: true,
        fechaDesde: fd,
        fechaHasta: fh,
      });
      return;
    }

    const yaExiste = analisisIAHistorial.some(
      (h) => h.periodo_desde === fd && h.periodo_hasta === fh
    );

    if (!yaExiste) {
      setConfirmGasto({
        mensaje: `Este período todavía no se ha analizado. Se va a generar un análisis nuevo con IA y va a consumir 1 de tus análisis del mes${sufijoRestante}.`,
        forzar: false,
        fechaDesde: fd,
        fechaHasta: fh,
      });
      return;
    }

    // Ya está en el historial - puede salir gratis del caché, pero hay
    // que verificar primero si los datos cambiaron desde entonces, para
    // avisar ANTES de gastar en vez de enterarse recién con el resultado.
    try {
      const verificacion = await authFetch("/reportes/pnl_v1/analisis-ia/verificar", {
        method: "POST",
        body: JSON.stringify({ desde: fd, hasta: fh }),
      });
      if (verificacion?.actualizado) {
        ejecutarAnalisisIA(false, fd, fh);
      } else {
        setConfirmGasto({
          mensaje: `Los datos de este período cambiaron desde la última vez que se analizó, así que verlo de nuevo va a generar un análisis nuevo y va a consumir 1 de tus análisis del mes${sufijoRestante}.`,
          forzar: false,
          fechaDesde: fd,
          fechaHasta: fh,
        });
      }
    } catch {
      // Si la verificación falla, no bloquear al usuario - se deja pasar
      // directo (mismo comportamiento que había antes de este cambio).
      ejecutarAnalisisIA(false, fd, fh);
    }
  };

  const handleExportarWord = async () => {
    if (!analisisIATexto) return;
    setExportandoWord(true);
    try {
      // El .docx se genera en el backend (python-docx), no en el
      // navegador: la librería JS "docx" resultó incompatible con el
      // bundler de Next.js (Turbopack) - su propio código empaquetado
      // rompía el chunk entero. Generarlo server-side evita eso de raíz.
      const res = await fetch(`${API}/reportes/pnl_v1/analisis-ia/word`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          analisis_markdown: analisisIATexto,
          nombre_cliente: nombreCliente || "Cliente InsightsFlow",
          periodo: `${fechaDesde} a ${fechaHasta}`,
          desde: fechaDesde,
          hasta: fechaHasta,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analisis_ia_PyG_${(nombreCliente || "cliente").replace(/\s+/g, "_")}.docx`;
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
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
      alert("Éxito: se procesó el auxiliar contable.");
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error cargando el archivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchData();
    getWhoAmI().then((me) => {
      if (me?.proveedor_datos) {
        setProveedorDatos(me.proveedor_datos);
        // Clientes Alegra ven primero el formato nativo de Alegra; desde ahi
        // pueden cambiar a la vista PUC/NIIF con el boton "Ver segun PUC/NIIF".
        if (me.proveedor_datos === "alegra") setModoAlegraNativo(true);
      }
      if (me?.cliente?.nombre) setNombreCliente(me.cliente.nombre);
    });
    cargarEstadoAnalisisIA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcula KPIs/evolucion para la vista "como lo muestra Alegra
  // nativo": mueve impuestos_operativos (ICA) de Gastos Operacionales a
  // despues de Utilidad Antes de Impuestos. Utilidad Neta queda identica
  // en ambos modos - solo cambia donde se resta en la cascada.
  const aplicarModoAlegra = (k: Kpis & { costos_gastos?: number }) => {
    if (!modoAlegraNativo || proveedorDatos !== "alegra") return k;
    const imp = k.impuestos_operativos || 0;
    if (!imp) return k;
    const gastosOp = (k.gastos_operacionales || 0) - imp;
    const utilOp = (k.utilidad_operativa || 0) + imp;
    const ebitda = (k.ebitda || 0) + imp;
    const utilAntesImp = (k.utilidad_antes_impuestos || 0) + imp;
    const base = k.ingresos_totales || 0;
    return {
      ...k,
      gastos_operacionales: gastosOp,
      utilidad_operativa: utilOp,
      ebitda,
      utilidad_antes_impuestos: utilAntesImp,
      margen_operativo: base ? Math.round((utilOp / base) * 10000) / 100 : 0,
      margen_ebitda: base ? Math.round((ebitda / base) * 10000) / 100 : 0,
      ...(k.costos_gastos !== undefined ? { costos_gastos: k.costos_gastos - imp } : {}),
    };
  };

  const kpis = useMemo(() => aplicarModoAlegra(kpisApi) as Kpis, [kpisApi, modoAlegraNativo, proveedorDatos]);
  const evolucion = useMemo(
    () => evolucionApi.map((e) => aplicarModoAlegra(e) as EvolucionItem),
    [evolucionApi, modoAlegraNativo, proveedorDatos]
  );

  const periodos = useMemo(() => evolucion.map((e) => e.label), [evolucion]);

  const evolucionChart = useMemo(
    () =>
      evolucion.map((e) => ({
        ...e,
        ingresos_chart: e.ingresos_totales ?? e.ingresos ?? 0,
      })),
    [evolucion]
  );

  const getCuentas = (predicate: (c: CuentaItem) => boolean) =>
    composicion.filter(predicate);

  const ingOp = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "INGRESOS_OPERACIONALES",
          (x) => getCuentaPrefix(x.cuenta, 2) === "41"
        )
      ),
    [composicion]
  );

  const costos = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "COSTOS_VENTA",
          (x) => ["6", "7"].includes(getCuentaPrefix(x.cuenta, 1))
        )
      ),
    [composicion]
  );

  const gasOpTodas = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "GASTOS_OPERACIONALES",
          (x) => ["51", "52"].includes(getCuentaPrefix(x.cuenta, 2))
        )
      ),
    [composicion]
  );

  // "Gastos por Impuestos" (ICA/Industria y Comercio, cuenta PUC 5115, mas
  // cuentas Alegra sin codigo que el backend marca con es_impuesto_operativo
  // - ej. pagos a la DIAN sin cuenta PUC asignada): en modo "Ver como
  // Alegra" se sacan de Gastos Operacionales y se muestran como su propia
  // seccion despues de Utilidad Antes de Impuestos, igual que el reporte
  // nativo de Alegra - en modo PUC/NIIF se quedan adentro (correcto
  // contablemente, ver docstring del backend). El prefijo "5115" solo
  // sirve para cuentas con codigo PUC real; las cuentas sin codigo no
  // matchean ningun prefijo, por eso necesitan la bandera explicita.
  const esImpuestoOperativo = (c: CuentaItem) =>
    getCuentaPrefix(c.cuenta, 4) === "5115" || !!c.es_impuesto_operativo;

  const impuestosOpCuentas = useMemo(
    () => gasOpTodas.filter(esImpuestoOperativo),
    [gasOpTodas]
  );

  const enModoAlegra = modoAlegraNativo && proveedorDatos === "alegra";

  const gasOp = useMemo(
    () =>
      enModoAlegra
        ? gasOpTodas.filter((c) => !esImpuestoOperativo(c))
        : gasOpTodas,
    [gasOpTodas, enModoAlegra]
  );

  const ingNoOp = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "INGRESOS_NO_OPERACIONALES",
          (x) => getCuentaPrefix(x.cuenta, 2) === "42"
        )
      ),
    [composicion]
  );

  const gasNoOp = useMemo(
    () =>
      getCuentas((c) =>
        matchCuenta(
          c,
          "GASTOS_NO_OPERACIONALES",
          (x) => ["53", "54"].includes(getCuentaPrefix(x.cuenta, 2))
        )
      ),
    [composicion]
  );

  const getTotalesPorMes = (cuentas: CuentaItem[]) => {
    const totales: Record<string, number> = {};
    periodos.forEach((p) => {
      totales[p] = 0;
    });

    cuentas.forEach((c) => {
      periodos.forEach((p) => {
        totales[p] += c.valores_mes[p] || 0;
      });
    });

    return totales;
  };

  const sumCuentas = (cuentas: CuentaItem[]) =>
    cuentas.reduce((acc, c) => acc + (c.total || 0), 0);

  // Detalle por cuenta (composicion) siempre queda en su clasificacion PUC
  // real, sin importar el modo de vista - solo Industria y Comercio (5115)
  // se saca de gasOp/gasOpTodas arriba cuando el modo "como Alegra" esta
  // activo, y se muestra en su propia seccion (ver impuestosOpCuentas).
  const impuestosOpTotal = enModoAlegra ? sumCuentas(impuestosOpCuentas) : 0;
  const impuestosOpPorMes = getTotalesPorMes(impuestosOpCuentas);

  const totalIngOp = sumCuentas(ingOp);
  const totalCostos = sumCuentas(costos);
  const totalGasOp = sumCuentas(gasOp);
  const totalIngNoOp = sumCuentas(ingNoOp);
  const totalGasNoOp = sumCuentas(gasNoOp);

  const utilidadBruta = totalIngOp - totalCostos;
  const utilidadOperativa = utilidadBruta - totalGasOp;
  const utilidadAntesImpuestos =
    utilidadOperativa + totalIngNoOp - totalGasNoOp;
  // En modo "como Alegra", el ICA (impuestosOpTotal) se resta aqui, despues
  // de Utilidad Antes de Impuestos, en vez de dentro de Gastos
  // Operacionales - asi la Utilidad Neta final queda identica en ambos modos.
  const utilidadNeta = utilidadAntesImpuestos - impuestosOpTotal;

  const tIngOpMes = getTotalesPorMes(ingOp);
  const tCostosMes = getTotalesPorMes(costos);
  const tGasOpMes = getTotalesPorMes(gasOp);
  const tIngNoOpMes = getTotalesPorMes(ingNoOp);
  const tGasNoOpMes = getTotalesPorMes(gasNoOp);

  const ubMes = periodos.reduce(
    (acc, p) => ({ ...acc, [p]: tIngOpMes[p] - tCostosMes[p] }),
    {} as Record<string, number>
  );

  const uoMes = periodos.reduce(
    (acc, p) => ({ ...acc, [p]: ubMes[p] - tGasOpMes[p] }),
    {} as Record<string, number>
  );

  const uaiMes = periodos.reduce(
    (acc, p) => ({ ...acc, [p]: uoMes[p] + tIngNoOpMes[p] - tGasNoOpMes[p] }),
    {} as Record<string, number>
  );

  const unMes = periodos.reduce(
    (acc, p) => ({ ...acc, [p]: uaiMes[p] - (enModoAlegra ? (impuestosOpPorMes[p] || 0) : 0) }),
    {} as Record<string, number>
  );

  const alertasAuditoria = useMemo(() => {
    const alertas: string[] = [];

    if (utilidadOperativa > utilidadBruta) {
      alertas.push(
        "La utilidad operativa es mayor que la utilidad bruta. Esto sugiere gastos operacionales netos negativos o reclasificaciones contables."
      );
    }

    if ((kpis.ebitda || 0) < (kpis.utilidad_operativa || utilidadOperativa || 0)) {
      alertas.push(
        "El EBITDA quedó por debajo de la utilidad operativa. Revisa cuentas de depreciación/amortización."
      );
    }

    const sumaMesesGasOp = Object.values(tGasOpMes).reduce((a, b) => a + b, 0);
    if (Math.abs(totalGasOp - sumaMesesGasOp) > 1) {
      alertas.push(
        "El acumulado de gastos operacionales no coincide con la suma visual de los meses. Puede haber signos ocultos o compensaciones."
      );
    }

    return alertas;
  }, [utilidadOperativa, utilidadBruta, kpis.ebitda, kpis.utilidad_operativa, totalGasOp, tGasOpMes]);

  const periodoActual = useMemo(() => {
    if (!evolucion.length) return null;
    return evolucion[evolucion.length - 1];
  }, [evolucion]);

  const periodoAnterior = useMemo(() => {
    if (evolucion.length < 2) return null;
    return evolucion[evolucion.length - 2];
  }, [evolucion]);

  const topImpactos = useMemo(() => {
    const grupos = [
      ...ingOp.map((c) => ({ ...c, grupo: "ingreso" as const })),
      ...costos.map((c) => ({ ...c, grupo: "costo" as const })),
      ...gasOp.map((c) => ({ ...c, grupo: "gasto" as const })),
      ...ingNoOp.map((c) => ({ ...c, grupo: "ingreso_no_op" as const })),
      ...gasNoOp.map((c) => ({ ...c, grupo: "gasto_no_op" as const })),
    ];

    return grupos
      .map((c) => ({
        cuenta: c.cuenta,
        nombre: c.nombre,
        total: c.total || 0,
        grupo: c.grupo,
        impacto: Math.abs(c.total || 0),
      }))
      .sort((a, b) => b.impacto - a.impacto)
      .slice(0, 5);
  }, [ingOp, costos, gasOp, ingNoOp, gasNoOp]);

  const interpretacionGerencial = useMemo(() => {
    const resumen: string[] = [];
    const variaciones: string[] = [];
    const hallazgos: string[] = [];
    const alertas: string[] = [];

    const ingresos = totalIngOp || 0;
    const costosVenta = totalCostos || 0;
    const gastosOperacion = totalGasOp || 0;
    const ingresosNoOp = totalIngNoOp || 0;
    const gastosNoOperacion = totalGasNoOp || 0;

    resumen.push(
      `La empresa registra ingresos operacionales netos por ${formatCurrency(ingresos)} y una utilidad neta acumulada de ${formatCurrency(utilidadNeta)}.`
    );

    if (utilidadNeta > 0) {
      resumen.push(
        `El negocio cerró el período con rentabilidad positiva, apoyado en una utilidad operativa de ${formatCurrency(utilidadOperativa)}.`
      );
    } else if (utilidadNeta < 0) {
      resumen.push(
        `El período cerró con pérdida neta de ${formatCurrency(utilidadNeta)}, por lo que conviene revisar presión en costos, gastos y devoluciones.`
      );
    } else {
      resumen.push(`El período cerró en punto de equilibrio neto.`);
    }

    if (periodoActual && periodoAnterior) {
      const actualIngresos = periodoActual.ingresos_totales ?? periodoActual.ingresos ?? 0;
      const anteriorIngresos = periodoAnterior.ingresos_totales ?? periodoAnterior.ingresos ?? 0;

      const actualUb = periodoActual.utilidad_bruta ?? 0;
      const anteriorUb = periodoAnterior.utilidad_bruta ?? 0;

      const actualUo = periodoActual.utilidad_operativa ?? 0;
      const anteriorUo = periodoAnterior.utilidad_operativa ?? 0;

      const actualUn = periodoActual.utilidad_neta ?? 0;
      const anteriorUn = periodoAnterior.utilidad_neta ?? 0;

      variaciones.push(
        `Frente a ${periodoAnterior.label}, los ingresos ${tendenciaTexto(actualIngresos, anteriorIngresos)} a ${formatCurrency(actualIngresos)} (${formatDeltaCurrency(actualIngresos, anteriorIngresos)} / ${formatDeltaPercent(actualIngresos, anteriorIngresos)}).`
      );

      variaciones.push(
        `La utilidad bruta ${tendenciaTexto(actualUb, anteriorUb)} a ${formatCurrency(actualUb)} (${formatDeltaCurrency(actualUb, anteriorUb)} / ${formatDeltaPercent(actualUb, anteriorUb)}).`
      );

      variaciones.push(
        `La utilidad operativa ${tendenciaTexto(actualUo, anteriorUo)} a ${formatCurrency(actualUo)} (${formatDeltaCurrency(actualUo, anteriorUo)} / ${formatDeltaPercent(actualUo, anteriorUo)}).`
      );

      variaciones.push(
        `La utilidad neta ${tendenciaTexto(actualUn, anteriorUn)} a ${formatCurrency(actualUn)} (${formatDeltaCurrency(actualUn, anteriorUn)} / ${formatDeltaPercent(actualUn, anteriorUn)}).`
      );
    } else if (periodoActual) {
      variaciones.push(
        `Solo hay un período disponible en el rango seleccionado (${periodoActual.label}), por lo que aún no se puede comparar contra un mes anterior.`
      );
    }

    if (ingresos > 0) {
      hallazgos.push(
        `Los costos de venta consumen ${absPercent(costosVenta, ingresos).toFixed(1)}% de los ingresos operacionales.`
      );

      hallazgos.push(
        `Los gastos operacionales netos equivalen a ${absPercent(gastosOperacion, ingresos).toFixed(1)}% de los ingresos operacionales.`
      );
    }

    if (ingresosNoOp > 0 || gastosNoOperacion > 0) {
      hallazgos.push(
        `El resultado no operacional aporta ${formatCurrency(ingresosNoOp - gastosNoOperacion)} al cierre del período.`
      );
    }

    if (utilidadOperativa > utilidadBruta) {
      hallazgos.push(
        `La utilidad operativa supera la utilidad bruta, lo que indica que hubo recuperación neta o reversión en gastos operacionales.`
      );
    }

    if (gastosOperacion < 0) {
      hallazgos.push(
        `Los gastos operacionales presentan saldo neto negativo (${formatSignedCurrency(gastosOperacion)}), situación poco habitual en lectura gerencial tradicional.`
      );
    }

    topImpactos.forEach((item, idx) => {
      if (idx < 3) {
        hallazgos.push(
          `Entre las cuentas con mayor impacto aparece ${item.cuenta} - ${item.nombre}, con ${formatSignedCurrency(item.total)}.`
        );
      }
    });

    if (gastosOperacion < 0) {
      alertas.push(
        "Se detectan gastos operacionales netos negativos. Conviene validar si corresponde a reversiones contables, provisiones o reclasificaciones."
      );
    }

    if (utilidadOperativa > utilidadBruta) {
      alertas.push(
        "La utilidad operativa está por encima de la utilidad bruta. Esto no es un comportamiento usual y merece lectura contable específica."
      );
    }

    if (periodoActual && periodoAnterior) {
      const actualIngresos = periodoActual.ingresos_totales ?? periodoActual.ingresos ?? 0;
      const anteriorIngresos = periodoAnterior.ingresos_totales ?? periodoAnterior.ingresos ?? 0;
      const pctIngresos = porcentajeCambio(actualIngresos, anteriorIngresos);

      if (pctIngresos !== null && pctIngresos <= -20) {
        alertas.push(
          "Los ingresos cayeron más de 20% frente al período anterior. Recomienda revisar ventas, devoluciones y ritmo comercial."
        );
      }

      const actualUn = periodoActual.utilidad_neta ?? 0;
      const anteriorUn = periodoAnterior.utilidad_neta ?? 0;
      const pctUN = porcentajeCambio(actualUn, anteriorUn);

      if (pctUN !== null && pctUN <= -20) {
        alertas.push(
          "La utilidad neta cayó más de 20% frente al período anterior. Esto amerita revisar presión de costos, gastos y partidas extraordinarias."
        );
      }
    }

    return { resumen, variaciones, hallazgos, alertas };
  }, [
    evolucion,
    periodoActual,
    periodoAnterior,
    topImpactos,
    totalIngOp,
    totalCostos,
    totalGasOp,
    totalIngNoOp,
    totalGasNoOp,
    utilidadBruta,
    utilidadOperativa,
    utilidadNeta,
  ]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const kpisSheet = XLSX.utils.json_to_sheet([
      {
        indicador: "Ingresos Totales",
        valor: kpis.ingresos_totales || 0,
        margen: "",
      },
      {
        indicador: "Utilidad Bruta",
        valor: kpis.utilidad_bruta || 0,
        margen: kpis.margen_bruto || 0,
      },
      {
        indicador: "Utilidad Operativa",
        valor: kpis.utilidad_operativa || utilidadOperativa || 0,
        margen: kpis.margen_operativo || 0,
      },
      {
        indicador: "EBITDA",
        valor: kpis.ebitda || 0,
        margen: kpis.margen_ebitda || 0,
      },
      {
        indicador: "Utilidad Neta",
        valor: kpis.utilidad_neta || 0,
        margen: kpis.margen_neto || 0,
      },
    ]);

    const evolucionSheet = XLSX.utils.json_to_sheet(
      evolucion.map((e) => ({
        periodo: e.label,
        ingresos: e.ingresos_totales ?? e.ingresos ?? 0,
        costos_gastos: e.costos_gastos ?? 0,
        utilidad_bruta: e.utilidad_bruta ?? 0,
        utilidad_operativa: e.utilidad_operativa ?? 0,
        ebitda: e.ebitda ?? 0,
        utilidad_neta: e.utilidad_neta ?? 0,
      }))
    );

    const matrizRows: any[] = [];

    const pushSection = (sectionName: string, cuentas: CuentaItem[]) => {
      cuentas.forEach((c) => {
        const row: Record<string, any> = {
          seccion: sectionName,
          cuenta: c.cuenta,
          nombre: c.nombre,
          total: c.total,
        };
        periodos.forEach((p) => {
          row[p] = c.valores_mes[p] || 0;
        });
        matrizRows.push(row);
      });
    };

    pushSection("INGRESOS OPERACIONALES", ingOp);
    pushSection("COSTOS DE VENTA", costos);
    pushSection("GASTOS OPERACIONALES", gasOp);
    pushSection("INGRESOS NO OPERACIONALES", ingNoOp);
    pushSection("GASTOS NO OPERACIONALES", gasNoOp);
    // En modo "Ver como Alegra" el ICA se saca de GASTOS OPERACIONALES y se
    // muestra como su propia seccion (igual que en pantalla); si no se agrega
    // aqui, el detalle exportado no cuadra con la Utilidad Neta mostrada.
    if (enModoAlegra && impuestosOpCuentas.length > 0) {
      pushSection("GASTOS POR IMPUESTOS (ICA)", impuestosOpCuentas);
    }

    const matrizSheet = XLSX.utils.json_to_sheet(matrizRows);

    XLSX.utils.book_append_sheet(wb, kpisSheet, "KPIs");
    XLSX.utils.book_append_sheet(wb, evolucionSheet, "Evolucion");
    XLSX.utils.book_append_sheet(wb, matrizSheet, "Matriz");

    XLSX.writeFile(wb, `pnl_${fechaDesde}_a_${fechaHasta}.xlsx`);
  };

  // Reusado tal cual en el modal (pantalla) y en el área imprimible, para
  // no duplicar el markup del gráfico en dos lugares.
  const renderTendenciaChart = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={evolucionChart} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold" }} />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="ingresos_chart" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24}>
          <LabelList dataKey="ingresos_chart" content={<BarLabel />} />
        </Bar>
        <Bar dataKey="costos_gastos" name="Costos y Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24}>
          <LabelList dataKey="costos_gastos" content={<BarLabel />} />
        </Bar>
        <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}>
          <LabelList dataKey="ebitda" content={<LineLabel />} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <div id="pagina-estado-resultados" className="space-y-4 p-5 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Estado de Resultados (P&amp;L)
            <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              Premium
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Análisis Financiero, Márgenes y Análisis Horizontal Automático.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />

            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black hover:bg-emerald-100 transition-all border border-emerald-100"
            >
              <Download size={16} />
              Exportar Excel
            </button>

            <button
              onClick={() => solicitarAnalisisIA(false)}
              className="flex items-center gap-2 px-4 py-3 bg-violet-50 text-violet-700 rounded-2xl text-xs font-black hover:bg-violet-100 transition-all border border-violet-100"
            >
              <Sparkles size={16} />
              Analizar con IA
            </button>

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
          </div>

          <p className="text-slate-400 text-[10px] font-semibold italic">
            {proveedorDatos === "alegra"
              ? "Ruta Alegra: Contabilidad > Libro Diario > Exportar Excel"
              : <>Ruta Siigo: Contabilidad {" > "} Comprobantes {" > "} Informe auxiliar contable</>}
          </p>

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
                            setFechaDesde(h.periodo_desde);
                            setFechaHasta(h.periodo_hasta);
                            setHistorialOpen(false);
                            solicitarAnalisisIA(false, h.periodo_desde, h.periodo_hasta);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-violet-50 border-b border-slate-50 last:border-0"
                        >
                          <div className="font-bold text-slate-700">{h.periodo_desde} a {h.periodo_hasta}</div>
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

      {proveedorDatos === "alegra" && (kpisApi.impuestos_operativos || 0) !== 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-[1.5rem] p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <p className="text-indigo-900 text-xs font-medium leading-relaxed">
            {modoAlegraNativo ? (
              <>
                <strong>Vista: como lo muestra Alegra.</strong> El Impuesto de Industria y Comercio (ICA) se resta después de
                &quot;Utilidad Antes de Impuestos&quot;, igual que en el reporte nativo de Alegra. La Utilidad Neta final es la misma en
                los dos modos — solo cambia en qué punto de la cascada se resta ese gasto.
              </>
            ) : (
              <>
                <strong>Vista: norma contable PUC/NIIF (por defecto).</strong> El Impuesto de Industria y Comercio (ICA) se trata
                como gasto operacional, no como impuesto sobre la utilidad — así lo clasifica el PUC colombiano (cuenta 5115,
                dentro de Gastos de Administración). Por eso la Utilidad Operativa puede verse distinta a la de Alegra, aunque
                la Utilidad Neta final coincide.
              </>
            )}
          </p>
          <button
            onClick={() => setModoAlegraNativo((v) => !v)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 border border-indigo-300 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all"
          >
            {modoAlegraNativo ? "Ver según norma PUC/NIIF" : "Ver como Alegra"}
          </button>
        </div>
      )}

      {proveedorDatos === "alegra" && cobertura && cobertura.monto_sin_codigo > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-amber-900 text-xs font-medium leading-relaxed">
                <strong>{formatCurrency(cobertura.monto_sin_codigo)}</strong> de este período
                ({formatPercent(100 - cobertura.pct_cobertura * 100)} de tus movimientos) se clasificó
                automáticamente por no tener código contable en Alegra.{" "}
                <strong>Ya está incluido en tu Utilidad Neta</strong> — lo que falta es precisión, no plata.
              </p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Sin el código contable no podemos separar con exactitud si algo es operacional o no operacional,
                ni darte el detalle por sub-cuenta. Para esa precisión, pídele a tu contador que nombre (asigne)
                el código contable de estas cuentas en Alegra. Es un ajuste de una sola vez — una vez asignado, se
                refleja automáticamente en la próxima sincronización, sin cambiar tu Utilidad Neta final.
              </p>
            </div>
            <button
              onClick={() => setMostrarDetalleCobertura((v) => !v)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-xl text-xs font-black hover:bg-amber-100 transition-all"
            >
              {mostrarDetalleCobertura ? <Minus size={14} /> : <Plus size={14} />}
              Ver detalle
            </button>
          </div>

          {mostrarDetalleCobertura && (
            <div className="flex flex-col gap-4">
              {[
                {
                  titulo: "Cuentas de tu plan de cuentas sin código asignado",
                  accion:
                    "Qué hacer: pídele a tu contador que entre a Alegra → Contabilidad → Plan de Cuentas, busque estas cuentas y les asigne un código contable (PUC).",
                  resultado:
                    "Resultado esperado: el monto ya está en tu Utilidad Neta hoy. Al asignar el código, se reclasifica con precisión (operacional/no operacional, sub-cuenta) — la Utilidad Neta no debería cambiar, sí puede cambiar cómo se ven la Utilidad Bruta, Operativa y el EBITDA en el camino hasta ahí.",
                  items: cobertura.detalle_cuentas_existentes,
                },
                {
                  titulo: "Etiquetas que no existen como cuenta propia en tu plan de cuentas",
                  accion:
                    "Qué hacer: consulta con tu contador si estas deben registrarse como una cuenta contable propia en Alegra (suelen venir de nómina automática u otros módulos).",
                  resultado:
                    "Resultado esperado: el monto ya está en tu Utilidad Neta hoy, clasificado por su tipo (ingreso/costo/gasto). Si se crea como cuenta propia y se codifica, se reclasifica con precisión total en la próxima sincronización.",
                  items: cobertura.detalle_cuentas_no_existentes,
                },
              ]
                .filter((grupo) => grupo.items.length > 0)
                .map((grupo) => (
                  <div key={grupo.titulo} className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
                    <div className="px-3 py-2 bg-amber-100/60">
                      <p className="text-amber-900 text-[11px] font-black">{grupo.titulo}</p>
                      <p className="text-amber-800 text-[10px] mt-0.5 leading-relaxed">{grupo.accion}</p>
                      <p className="text-amber-800 text-[10px] leading-relaxed">{grupo.resultado}</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-amber-100/40 text-amber-900">
                          <th className="text-left font-black px-3 py-2">Cuenta</th>
                          <th className="text-right font-black px-3 py-2">Monto</th>
                          <th className="text-right font-black px-3 py-2">Movimientos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.items.map((item) => (
                          <tr key={item.cuenta_nombre} className="border-t border-amber-100">
                            <td className="px-3 py-2 text-slate-700">{item.cuenta_nombre}</td>
                            <td className="px-3 py-2 text-right text-slate-700 font-semibold">
                              {formatCurrency(item.monto)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-400">{item.n_filas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* FILTROS + VISTA */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-[2rem] border shadow-sm items-end justify-between">
        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col min-w-[240px]">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1">
              Rango de Análisis
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border rounded-xl p-2 text-xs font-bold bg-slate-50"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black text-white uppercase ml-1 mb-1">
              .
            </label>
            <button
              onClick={fetchData}
              className="bg-indigo-50 text-indigo-700 font-black px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Actualizando..." : "Filtrar P&L"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1 border">
            <button
              onClick={() => setVista("resumida")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                vista === "resumida"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <EyeOff size={14} />
              Vista resumida
            </button>
            <button
              onClick={() => setVista("detallada")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                vista === "detallada"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              <Eye size={14} />
              Vista detallada
            </button>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 rounded-2xl p-1 border border-amber-100">
            <button
              onClick={() => setModoVisual("gerencial")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                modoVisual === "gerencial"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Modo gerencial
            </button>
            <button
              onClick={() => setModoVisual("auditoria")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                modoVisual === "auditoria"
                  ? "bg-amber-600 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Modo auditoría
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <StatCard
          title="Ingresos Totales"
          value={kpis.ingresos_totales || 0}
          icon={<TrendingUp size={18} />}
          color="emerald"
          description={KPI_INFO.ingresosTotales.description}
          breakdown={[
            { label: "Operacionales", value: kpis.ingresos_operacionales || 0 },
            { label: "No operacionales", value: kpis.ingresos_no_operacionales || 0 },
          ]}
        />
        <StatCard
          title="Utilidad Bruta"
          value={kpis.utilidad_bruta || 0}
          icon={<DollarSign size={18} />}
          color="blue"
          badge={formatPercent(kpis.margen_bruto)}
          description={KPI_INFO.utilidadBruta.description}
          badgeDescription={KPI_INFO.utilidadBruta.marginDescription}
        />
        <StatCard
          title="Utilidad Operativa"
          value={kpis.utilidad_operativa || utilidadOperativa || 0}
          icon={<Landmark size={18} />}
          color="sky"
          badge={formatPercent(kpis.margen_operativo)}
          description={KPI_INFO.utilidadOperativa.description}
          badgeDescription={KPI_INFO.utilidadOperativa.marginDescription}
        />
        <StatCard
          title="EBITDA"
          value={kpis.ebitda || 0}
          icon={<Activity size={18} />}
          color="indigo"
          badge={formatPercent(kpis.margen_ebitda)}
          highlight
          description={KPI_INFO.ebitda.description}
          badgeDescription={KPI_INFO.ebitda.marginDescription}
        />
        <StatCard
          title="Utilidad Neta"
          value={kpis.utilidad_neta || 0}
          icon={<TrendingUp size={18} />}
          color="slate"
          badge={formatPercent(kpis.margen_neto)}
          description={KPI_INFO.utilidadNeta.description}
          badgeDescription={KPI_INFO.utilidadNeta.marginDescription}
        />
      </div>

      {/* GRÁFICA */}
      <Card className="rounded-[2rem] shadow-xl border-none bg-white p-2">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-tight flex justify-between">
            <span>📈 Tendencia P&amp;L Mensual</span>
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ingresos
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div> Costos/Gastos
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div> EBITDA
              </span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-2">
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart
              data={evolucionChart}
              margin={{ top: 28, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontWeight: "bold" }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />

              <Bar
                dataKey="ingresos_chart"
                name="Ingresos"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                barSize={40}
              >
                <LabelList dataKey="ingresos_chart" content={<BarLabel />} />
              </Bar>

              <Bar
                dataKey="costos_gastos"
                name="Costos y Gastos"
                fill="#f43f5e"
                radius={[6, 6, 0, 0]}
                barSize={40}
              >
                <LabelList dataKey="costos_gastos" content={<BarLabel />} />
              </Bar>

              <Line
                type="monotone"
                dataKey="ebitda"
                name="EBITDA"
                stroke="#4f46e5"
                strokeWidth={4}
                dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
              >
                <LabelList dataKey="ebitda" content={<LineLabel />} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ALERTAS AUDITORÍA */}
      {modoVisual === "auditoria" && alertasAuditoria.length > 0 && (
        <Card className="rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-black text-amber-800 uppercase tracking-wide mb-2">
              Alertas de auditoría
            </h3>
            <div className="space-y-2">
              {alertasAuditoria.map((alerta, idx) => (
                <div
                  key={idx}
                  className="text-sm text-amber-900 bg-white/70 border border-amber-100 rounded-xl px-3 py-2"
                >
                  {alerta}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MATRIZ */}
      {vista === "detallada" && (
        <>
          <Card className="rounded-[2rem] shadow-2xl border-none overflow-hidden bg-white">
            <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center">
              <div>
                <h2 className="font-black text-lg uppercase tracking-widest">
                  Estado de Resultados Integral (Matricial)
                </h2>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  Análisis Horizontal Mes a Mes + Acumulado
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllSections}
                  className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 text-xs font-black hover:bg-emerald-500/20 transition-all"
                >
                  Expandir todo
                </button>

                <button
                  type="button"
                  onClick={collapseAllSections}
                  className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-xs font-black hover:bg-white/10 transition-all"
                >
                  Contraer todo
                </button>

                <TableIcon size={30} className="text-emerald-400 opacity-60 ml-1" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b">
                    <th className="py-4 px-6 text-left sticky left-0 bg-slate-100 z-10 w-[360px]">
                      Concepto / Cuenta
                    </th>
                    {periodos.map((p) => (
                      <th key={p} className="py-4 px-4 text-right">
                        {p}
                      </th>
                    ))}
                    <th className="py-4 px-6 text-right bg-emerald-50 text-emerald-800 border-l border-emerald-100">
                      Total Acumulado
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  <SectionHeader
                    title="INGRESOS OPERACIONALES"
                    colSpan={periodos.length + 2}
                    expanded={openSections.ingOp}
                    onToggle={() => toggleSection("ingOp")}
                  />
                  {openSections.ingOp &&
                    ingOp.map((c) => (
                      <RowCuenta
                        key={c.cuenta}
                        cuenta={c}
                        isGasto={false}
                        periodos={periodos}
                        modoVisual={modoVisual}
                      />
                    ))}
                  <RowTotal
                    title="TOTAL INGRESOS OPERACIONALES"
                    totalesMes={tIngOpMes}
                    totalAcumulado={totalIngOp}
                    periodos={periodos}
                    modoVisual={modoVisual}
                  />

                  <SectionHeader
                    title="COSTOS DE VENTA"
                    colSpan={periodos.length + 2}
                    white
                    expanded={openSections.costos}
                    onToggle={() => toggleSection("costos")}
                  />
                  {openSections.costos &&
                    costos.map((c) => (
                      <RowCuenta
                        key={c.cuenta}
                        cuenta={c}
                        isGasto={true}
                        periodos={periodos}
                        modoVisual={modoVisual}
                      />
                    ))}
                  <RowTotal
                    title="TOTAL COSTOS DE VENTA"
                    totalesMes={tCostosMes}
                    totalAcumulado={totalCostos}
                    isGasto
                    periodos={periodos}
                    modoVisual={modoVisual}
                  />

                  <ResultRow
                    title="(=) Utilidad Bruta"
                    values={ubMes}
                    total={utilidadBruta}
                    periodos={periodos}
                    rowClass="bg-emerald-50"
                    titleClass="text-emerald-800 bg-emerald-50"
                    valueClass="text-emerald-800"
                    totalClass="text-emerald-900 bg-emerald-100/50 border-l border-emerald-200"
                  />

                  <SectionHeader
                    title="GASTOS OPERACIONALES"
                    colSpan={periodos.length + 2}
                    white
                    expanded={openSections.gasOp}
                    onToggle={() => toggleSection("gasOp")}
                  />
                  {openSections.gasOp &&
                    gasOp.map((c) => (
                      <RowCuenta
                        key={c.cuenta}
                        cuenta={c}
                        isGasto={true}
                        periodos={periodos}
                        modoVisual={modoVisual}
                      />
                    ))}
                  <RowTotal
                    title="TOTAL GASTOS OPERACIONALES"
                    totalesMes={tGasOpMes}
                    totalAcumulado={totalGasOp}
                    isGasto
                    periodos={periodos}
                    modoVisual={modoVisual}
                  />

                  <ResultRow
                    title="(=) Utilidad Operativa"
                    values={uoMes}
                    total={utilidadOperativa}
                    periodos={periodos}
                    rowClass="bg-blue-50"
                    titleClass="text-blue-800 bg-blue-50"
                    valueClass="text-blue-800"
                    totalClass="text-blue-900 bg-blue-100/50 border-l border-blue-200"
                  />

                  <SectionHeader
                    title="INGRESOS NO OPERACIONALES"
                    colSpan={periodos.length + 2}
                    white
                    expanded={openSections.ingNoOp}
                    onToggle={() => toggleSection("ingNoOp")}
                  />
                  {openSections.ingNoOp &&
                    ingNoOp.map((c) => (
                      <RowCuenta
                        key={c.cuenta}
                        cuenta={c}
                        isGasto={false}
                        periodos={periodos}
                        modoVisual={modoVisual}
                      />
                    ))}
                  <RowTotal
                    title="TOTAL INGRESOS NO OPERACIONALES"
                    totalesMes={tIngNoOpMes}
                    totalAcumulado={totalIngNoOp}
                    periodos={periodos}
                    modoVisual={modoVisual}
                  />

                  <SectionHeader
                    title="GASTOS NO OPERACIONALES"
                    colSpan={periodos.length + 2}
                    white
                    expanded={openSections.gasNoOp}
                    onToggle={() => toggleSection("gasNoOp")}
                  />
                  {openSections.gasNoOp &&
                    gasNoOp.map((c) => (
                      <RowCuenta
                        key={c.cuenta}
                        cuenta={c}
                        isGasto={true}
                        periodos={periodos}
                        modoVisual={modoVisual}
                      />
                    ))}
                  <RowTotal
                    title="TOTAL GASTOS NO OPERACIONALES"
                    totalesMes={tGasNoOpMes}
                    totalAcumulado={totalGasNoOp}
                    isGasto
                    periodos={periodos}
                    modoVisual={modoVisual}
                  />

                  <ResultRow
                    title="(=) Utilidad Antes de Impuestos"
                    values={uaiMes}
                    total={utilidadAntesImpuestos}
                    periodos={periodos}
                    rowClass="bg-amber-50"
                    titleClass="text-amber-800 bg-amber-50"
                    valueClass="text-amber-800"
                    totalClass="text-amber-900 bg-amber-100/50 border-l border-amber-200"
                  />

                  {enModoAlegra && impuestosOpCuentas.length > 0 && (
                    <>
                      <SectionHeader
                        title="GASTOS POR IMPUESTOS (ICA)"
                        colSpan={periodos.length + 2}
                        white
                        expanded
                        onToggle={() => {}}
                      />
                      {impuestosOpCuentas.map((c) => (
                        <RowCuenta
                          key={c.cuenta}
                          cuenta={c}
                          isGasto={true}
                          periodos={periodos}
                          modoVisual={modoVisual}
                        />
                      ))}
                      <RowTotal
                        title="TOTAL GASTOS POR IMPUESTOS"
                        totalesMes={impuestosOpPorMes}
                        totalAcumulado={impuestosOpTotal}
                        isGasto
                        periodos={periodos}
                        modoVisual={modoVisual}
                      />
                    </>
                  )}

                  <tr className="bg-slate-900 border-t-4 border-slate-900">
                    <td className="py-5 px-6 font-black text-white text-base uppercase tracking-widest sticky left-0 bg-slate-900">
                      (=) Utilidad Neta del Ejercicio
                    </td>
                    {periodos.map((p) => (
                      <td
                        key={p}
                        className="py-5 px-4 text-right font-black text-emerald-400 text-sm"
                      >
                        {formatCurrency(unMes[p])}
                      </td>
                    ))}
                    <td className="py-5 px-6 text-right font-black text-emerald-400 text-xl bg-slate-800 border-l border-slate-700">
                      {formatCurrency(utilidadNeta)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="rounded-[2rem] shadow-sm border bg-white mt-4">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Interpretación automática del resultado
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Lectura gerencial del período con base en KPIs, variaciones y composición del P&amp;L.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-4 space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Resumen ejecutivo
                </h4>
                {interpretacionGerencial.resumen.map((item, idx) => (
                  <p key={idx} className="text-sm text-slate-800 leading-6">
                    {item}
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border rounded-2xl p-4 bg-white">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-3">
                    Variación vs período anterior
                  </h4>
                  <div className="space-y-2">
                    {interpretacionGerencial.variaciones.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-2xl p-4 bg-white">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">
                    Hallazgos clave
                  </h4>
                  <div className="space-y-2">
                    {interpretacionGerencial.hallazgos.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-slate-700 bg-emerald-50 rounded-xl px-3 py-2"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {interpretacionGerencial.alertas.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-3">
                    Alertas gerenciales
                  </h4>
                  <div className="space-y-2">
                    {interpretacionGerencial.alertas.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-amber-900 bg-white/70 border border-amber-100 rounded-xl px-3 py-2"
                      >
                        ⚠️ {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {analisisIAOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4 print:hidden"
        >
          {/* Sin cierre por clic afuera a propósito: con resize:both, el
              navegador puede interpretar el "soltar" de un arrastre de
              redimensionado como un clic sobre el fondo (el modal, al
              estar centrado con flexbox, se recalcula durante el
              arrastre), cerrando el modal justo al agrandarlo. Mismo
              patrón que el modal de Ventas: se cierra solo con la X. */}
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
                    {fechaDesde} a {fechaHasta}
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
                  <p className="text-xs font-bold">Analizando el período seleccionado…</p>
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
                  <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Tendencia del período
                      </p>
                      <div className="flex gap-3 text-[10px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ingresos
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-rose-500"></div> Costos/Gastos
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-indigo-600"></div> EBITDA
                        </span>
                      </div>
                    </div>
                    {renderTendenciaChart(200)}
                  </div>

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
                      // Chrome sugiere el <title> de la página como nombre
                      // de archivo al "Guardar como PDF" - se cambia justo
                      // antes de imprimir (window.print() bloquea hasta
                      // que se cierra el diálogo) y se restaura después.
                      const tituloOriginal = document.title;
                      document.title = `analisis_ia_PyG_${(nombreCliente || "cliente").replace(/\s+/g, "_")}`;
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
                  const { forzar, fechaDesde: fd, fechaHasta: fh } = confirmGasto;
                  setConfirmGasto(null);
                  ejecutarAnalisisIA(forzar, fd, fh);
                }}
                className="px-4 py-2 bg-violet-700 text-white rounded-xl text-xs font-black hover:bg-violet-800"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Área imprimible: vive fuera del modal a propósito. El modal tiene
          altura fija + overflow para poder redimensionarse en pantalla, lo
          cual rompe la paginación al imprimir (y un ancestro con
          print:hidden esconde también a sus hijos, sin importar su propia
          visibility). Este bloque, siendo hermano del modal y sin
          restricciones de tamaño, permite que el contenido pagine
          normalmente a varias hojas. */}
      {/* Siempre montado (nunca display:none) a propósito: el gráfico de
          recharts necesita medir su contenedor al montarse, y si el
          contenedor arranca en display:none nunca llega a medir nada y
          queda en blanco. En vez de ocultarlo, se posiciona fuera de la
          pantalla (renderizado normal, con ancho real) y solo se trae a
          la vista con CSS cuando se imprime. */}
      {analisisIATexto && (
        <div id="analisis-ia-print-area" style={{ position: "absolute", top: "-9999px", left: 0, width: "800px" }}>
          <div className="mb-4 pb-3 border-b border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/insightsflow-logo.png" alt="InsightsFlow" className="h-8 w-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">{nombreCliente || "Cliente InsightsFlow"}</div>
            <div className="text-xs text-slate-400">Estado de Resultados · {fechaDesde} a {fechaHasta}</div>
          </div>

          <div className="mb-4">{renderTendenciaChart(220)}</div>

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
          #pagina-estado-resultados > *:not(#analisis-ia-print-area) {
            display: none !important;
          }
          #analisis-ia-print-area {
            position: static !important;
            width: 100% !important;
          }
          /* Cuando una tabla del análisis se parte entre dos hojas, que
             el encabezado se repita en la hoja siguiente - sin esto, la
             continuación de una tabla larga arranca con solo números, sin
             decir qué es cada columna. */
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

// =========================================================
// SUBCOMPONENTES
// =========================================================
const InfoHint = ({
  text,
  dark = false,
  align = "right",
}: {
  text: string;
  dark?: boolean;
  align?: "left" | "right";
}) => (
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
      className={`pointer-events-none absolute top-6 z-50 w-64 sm:w-72 rounded-2xl border px-3 py-3 text-[11px] leading-5 shadow-2xl opacity-0 scale-95 transition-all duration-200 group-hover/info:opacity-100 group-hover/info:scale-100 group-focus-within/info:opacity-100 group-focus-within/info:scale-100 ${
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

const SectionHeader = ({
  title,
  colSpan,
  white = false,
  expanded,
  onToggle,
}: {
  title: string;
  colSpan: number;
  white?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <tr className={white ? "" : "bg-slate-50/50"}>
    <td
      colSpan={colSpan}
      className={`py-3 px-6 font-black text-slate-800 text-base sticky left-0 ${
        white ? "bg-white pt-6" : "bg-slate-50/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              expanded ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
          {title}
        </span>

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:scale-105 active:scale-95"
          title={expanded ? "Contraer sección" : "Expandir sección"}
        >
          <span className="transition-transform duration-200">
            {expanded ? <Minus size={16} /> : <Plus size={16} />}
          </span>
        </button>
      </div>
    </td>
  </tr>
);

const RowCuenta = ({
  cuenta,
  isGasto,
  periodos,
  modoVisual,
}: {
  cuenta: CuentaItem;
  isGasto: boolean;
  periodos: string[];
  modoVisual: ModoVisual;
}) => (
  <tr className="hover:bg-slate-50 transition-colors group">
    <td className="py-2 px-6 text-slate-600 font-medium text-xs flex gap-3 items-center sticky left-0 bg-white group-hover:bg-slate-50 transition-colors w-[360px]">
      <span className="font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">
        {cuenta.cuenta}
      </span>
      <span
        className="group-hover:text-indigo-600 transition-colors truncate"
        title={cuenta.nombre}
      >
        {cuenta.nombre}
      </span>
    </td>

    {periodos.map((p) => {
      const valorReal = cuenta.valores_mes[p] || 0;
      const valorMostrar = normalizeDisplayValue(valorReal, modoVisual, isGasto);

      let cls = "text-slate-800";
      if (modoVisual === "auditoria") {
        cls =
          valorReal < 0
            ? "text-amber-700"
            : isGasto
            ? "text-rose-600"
            : "text-slate-800";
      } else {
        cls = isGasto ? "text-rose-600" : "text-slate-800";
      }

      return (
        <td key={p} className={`py-2 px-4 text-right font-bold text-xs ${cls}`}>
          {modoVisual === "auditoria"
            ? formatSignedCurrency(valorReal)
            : formatCurrency(valorMostrar)}
        </td>
      );
    })}

    <td
      className={`py-2 px-6 text-right font-black text-xs bg-slate-50/50 border-l border-slate-100 ${
        modoVisual === "auditoria"
          ? cuenta.total < 0
            ? "text-amber-700"
            : isGasto
            ? "text-rose-700"
            : "text-slate-900"
          : isGasto
          ? "text-rose-700"
          : "text-slate-900"
      }`}
    >
      {modoVisual === "auditoria"
        ? formatSignedCurrency(cuenta.total || 0)
        : formatCurrency(
            normalizeDisplayValue(cuenta.total || 0, modoVisual, isGasto)
          )}
    </td>
  </tr>
);

const RowTotal = ({
  title,
  totalesMes,
  totalAcumulado,
  isGasto = false,
  periodos,
  modoVisual,
}: {
  title: string;
  totalesMes: Record<string, number>;
  totalAcumulado: number;
  isGasto?: boolean;
  periodos: string[];
  modoVisual: ModoVisual;
}) => (
  <tr className="border-t border-slate-200 bg-slate-50/80">
    <td className="py-3 px-6 font-black text-slate-700 text-[11px] sticky left-0 bg-slate-50/80">
      {title}
    </td>
    {periodos.map((p) => {
      const valorReal = totalesMes[p] || 0;
      const valorMostrar = normalizeDisplayValue(valorReal, modoVisual, isGasto);

      let cls = "text-slate-900";
      if (modoVisual === "auditoria") {
        cls =
          valorReal < 0
            ? "text-amber-700"
            : isGasto
            ? "text-rose-600"
            : "text-slate-900";
      } else {
        cls = isGasto ? "text-rose-600" : "text-slate-900";
      }

      return (
        <td key={p} className={`py-3 px-4 text-right font-black text-xs ${cls}`}>
          {modoVisual === "auditoria"
            ? formatSignedCurrency(valorReal)
            : formatCurrency(valorMostrar)}
        </td>
      );
    })}
    <td
      className={`py-3 px-6 text-right font-black text-sm bg-slate-100/50 border-l border-slate-200 ${
        modoVisual === "auditoria"
          ? totalAcumulado < 0
            ? "text-amber-700"
            : isGasto
            ? "text-rose-700"
            : "text-slate-900"
          : isGasto
          ? "text-rose-700"
          : "text-slate-900"
      }`}
    >
      {modoVisual === "auditoria"
        ? formatSignedCurrency(totalAcumulado || 0)
        : formatCurrency(
            normalizeDisplayValue(totalAcumulado || 0, modoVisual, isGasto)
          )}
    </td>
  </tr>
);

const ResultRow = ({
  title,
  values,
  total,
  periodos,
  rowClass,
  titleClass,
  valueClass,
  totalClass,
}: {
  title: string;
  values: Record<string, number>;
  total: number;
  periodos: string[];
  rowClass: string;
  titleClass: string;
  valueClass: string;
  totalClass: string;
}) => (
  <tr className={rowClass}>
    <td
      className={`py-4 px-6 font-black text-sm uppercase sticky left-0 ${titleClass}`}
    >
      {title}
    </td>
    {periodos.map((p) => (
      <td key={p} className={`py-4 px-4 text-right font-black text-sm ${valueClass}`}>
        {formatCurrency(values[p] || 0)}
      </td>
    ))}
    <td className={`py-4 px-6 text-right font-black text-base ${totalClass}`}>
      {formatCurrency(total || 0)}
    </td>
  </tr>
);

const StatCard = ({
  title,
  value,
  icon,
  color,
  badge,
  highlight = false,
  description,
  badgeDescription,
  breakdown, // NUEVO
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "sky" | "indigo" | "slate";
  badge?: string;
  highlight?: boolean;
  description: string;
  badgeDescription?: string;
  breakdown?: { label: string; value: number }[]; // NUEVO
}) => {
  const themes: Record<string, string> = {
    emerald: "text-emerald-600 bg-white border-slate-100",
    blue: "text-blue-600 bg-white border-slate-100",
    sky: "text-sky-600 bg-white border-slate-100",
    indigo: "text-indigo-600 bg-white border-slate-100",
    slate: "text-slate-700 bg-white border-slate-100",
  };

  return (
    <Card
      className={`relative z-0 hover:z-30 focus-within:z-30 overflow-visible border shadow-lg rounded-[2rem] transition-all hover:scale-[1.01] ${
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

          {badge && (
            <div
              className={`text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1.5 ${
                highlight
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <span>{badge} MARGEN</span>
              {badgeDescription && (
                <InfoHint
                  text={badgeDescription}
                  dark={false}
                  align="right"
                />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p
            className={`text-[9px] font-black uppercase tracking-widest ${
              highlight ? "text-indigo-100" : "text-slate-400"
            }`}
          >
            {title}
          </p>

          <InfoHint
            text={description}
            dark={highlight}
            align="left"
          />
        </div>

        <p className="text-[1.9rem] leading-none font-black mt-1 tracking-tighter">
          {formatCurrency(value || 0)}
        </p>

        {breakdown && breakdown.length > 0 && (
          <div className={`mt-2 pt-2 border-t space-y-0.5 ${highlight ? "border-white/20" : "border-slate-100"}`}>
            {breakdown.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between text-[10px] font-bold ${
                  highlight ? "text-indigo-100" : "text-slate-400"
                }`}
              >
                <span>{item.label}</span>
                <span>{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        )}        
      </CardContent>
    </Card>
  );
};