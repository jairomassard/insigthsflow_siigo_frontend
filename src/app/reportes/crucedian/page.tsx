"use client";

import { useEffect, useState, useRef } from "react";
import { authFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, RefreshCcw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

const formatCurrency = (val: number | null | undefined) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val || 0);

type ItemCruce = {
  cufe?: string;
  folio?: string;
  fecha?: string;
  tercero_nit?: string;
  tercero_nombre?: string;
  iva_dian?: number;
  total_dian?: number;
  siigo_id?: string;
  iva_siigo?: number | null;
  total_siigo?: number | null;
  estado?: string;
};

type SeccionData = {
  resumen: {
    total_dian: number;
    coincide: number;
    monto_distinto: number;
    falta_en_siigo: number;
    extra_en_siigo: number;
  };
  coincide: ItemCruce[];
  monto_distinto: ItemCruce[];
  falta_en_siigo: ItemCruce[];
  extra_en_siigo: ItemCruce[];
};

const SECCIONES: { key: string; titulo: string }[] = [
  { key: "ventas", titulo: "Facturas de Venta" },
  { key: "notas_credito", titulo: "Notas Crédito" },
  { key: "compras", titulo: "Facturas de Compra" },
  { key: "documento_soporte", titulo: "Documento Soporte" },
];

const NOMBRE_PROVEEDOR: Record<string, string> = {
  siigo: "Siigo",
  alegra: "Alegra",
};

export default function CruceDianPage() {
  useAuthGuard();

  const [data, setData] = useState<Record<string, SeccionData>>({});
  const [proveedorDatos, setProveedorDatos] = useState<string>("siigo");
  const [implementado, setImplementado] = useState(true);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState("2026-01-01");
  const [fechaHasta, setFechaHasta] = useState("2026-12-31");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `/reportes/cruce_dian?desde=${fechaDesde}&hasta=${fechaHasta}`
      );
      setProveedorDatos(res?.proveedor_datos ?? "siigo");
      setImplementado(res?.implementado !== false);
      setMensaje(res?.mensaje ?? null);
      const { proveedor_datos, implementado: _impl, mensaje: _msg, ...secciones } = res ?? {};
      setData(secciones as Record<string, SeccionData>);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("archivo", file);
    try {
      const res = await authFetch("/reportes/cargar_dian_documentos", {
        method: "POST",
        body: formData,
      });
      alert(
        `Éxito: ${res?.detalles?.registros_procesados ?? 0} documentos procesados de la(s) hoja(s): ${(
          res?.detalles?.hojas_procesadas ?? []
        ).join(", ")}`
      );
      fetchData();
    } catch (err) {
      alert("Error cargando el archivo de la DIAN.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta]);

  return (
    <div className="space-y-3 p-4 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white px-5 py-3 rounded-[1.5rem] border shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Cruce DIAN vs Siigo{" "}
            <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest">
              V1
            </span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Compara documento por documento lo reportado a la DIAN contra lo sincronizado de Siigo.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95"
            >
              {uploading ? <RefreshCcw className="animate-spin" size={14} /> : <FileText size={14} />}
              {uploading ? "Cargando..." : "Cargar Export DIAN"}
            </button>
          </div>
          <p className="text-slate-400 text-[10px] font-semibold italic">
            DIAN: Facturación Electrónica &gt; Consultas &gt; Documentos recibidos/emitidos (exportar a Excel)
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white px-5 py-3 rounded-[1.5rem] border shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rango de Fecha</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full border rounded-xl p-1.5 text-xs font-bold bg-slate-50"
            />
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full border rounded-xl p-1.5 text-xs font-bold bg-slate-50"
            />
          </div>
        </div>
        <div className="md:col-span-2 flex items-end">
          <button
            onClick={fetchData}
            className="w-full bg-indigo-50 text-indigo-700 font-black py-1.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-indigo-100 hover:bg-indigo-100"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Cargando..." : "Actualizar Cruce"}
          </button>
        </div>
      </div>

      {!implementado ? (
        <Card className="rounded-[1.5rem] shadow-xl border-none bg-white p-6">
          <p className="text-sm font-bold text-slate-600">
            {mensaje ?? "Este cruce todavía no está disponible para tu sistema contable."}
          </p>
        </Card>
      ) : (
        SECCIONES.map((s) => (
          <SeccionCruce
            key={s.key}
            titulo={s.titulo}
            datos={data[s.key]}
            nombreProveedor={NOMBRE_PROVEEDOR[proveedorDatos] ?? proveedorDatos}
          />
        ))
      )}
    </div>
  );
}

type TipoEstado = "coincide" | "monto_distinto" | "falta_en_siigo" | "extra_en_siigo";

function SeccionCruce({
  titulo,
  datos,
  nombreProveedor,
}: {
  titulo: string;
  datos?: SeccionData;
  nombreProveedor: string;
}) {
  const r = datos?.resumen;

  // Por defecto se muestra solo lo accionable - "coincide" puede ser una
  // lista larga y no aporta nada para revisar.
  const [activos, setActivos] = useState<Set<TipoEstado>>(
    new Set(["falta_en_siigo", "monto_distinto", "extra_en_siigo"])
  );

  const toggle = (tipo: TipoEstado) => {
    setActivos((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  };

  const todasLasFilas = [
    ...(datos?.coincide ?? []).map((d) => ({ ...d, _tipo: "coincide" as const })),
    ...(datos?.falta_en_siigo ?? []).map((d) => ({ ...d, _tipo: "falta_en_siigo" as const })),
    ...(datos?.monto_distinto ?? []).map((d) => ({ ...d, _tipo: "monto_distinto" as const })),
    ...(datos?.extra_en_siigo ?? []).map((d) => ({ ...d, _tipo: "extra_en_siigo" as const })),
  ];
  const filas = todasLasFilas.filter((f) => activos.has(f._tipo));

  return (
    <Card className="rounded-[1.5rem] shadow-xl border-none bg-white overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-3 flex justify-between items-center">
        <span className="font-black text-xs uppercase tracking-widest">{titulo}</span>
        <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20 uppercase tracking-tighter">
          {r?.total_dian ?? 0} documentos DIAN en el período
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <Pill
          icon={<CheckCircle2 size={14} />}
          color="emerald"
          label="Coincide"
          value={r?.coincide}
          activo={activos.has("coincide")}
          onClick={() => toggle("coincide")}
        />
        <Pill
          icon={<AlertTriangle size={14} />}
          color="orange"
          label="Monto distinto"
          value={r?.monto_distinto}
          activo={activos.has("monto_distinto")}
          onClick={() => toggle("monto_distinto")}
        />
        <Pill
          icon={<XCircle size={14} />}
          color="red"
          label="Falta en Siigo"
          value={r?.falta_en_siigo}
          activo={activos.has("falta_en_siigo")}
          onClick={() => toggle("falta_en_siigo")}
        />
        <Pill
          icon={<HelpCircle size={14} />}
          color="slate"
          label="Extra en Siigo"
          value={r?.extra_en_siigo}
          activo={activos.has("extra_en_siigo")}
          onClick={() => toggle("extra_en_siigo")}
        />
      </div>

      {todasLasFilas.length > 0 && filas.length === 0 && (
        <p className="px-5 pb-4 text-xs text-slate-400 font-semibold">
          No hay filas para los filtros seleccionados. Activa alguna de las categorías de arriba.
        </p>
      )}

      {filas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-slate-400 font-black text-[10px] uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Documento</th>
                <th className="px-4 py-2 text-left">Tercero</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-right">Total DIAN</th>
                <th className="px-4 py-2 text-right">Total {nombreProveedor}</th>
                <th className="px-4 py-2 text-right">IVA DIAN</th>
                <th className="px-4 py-2 text-right">IVA {nombreProveedor}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filas.map((f, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-2">
                    <EstadoBadge tipo={f._tipo} />
                  </td>
                  <td className="px-4 py-2 text-slate-700">{f.folio || f.siigo_id || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{f.tercero_nombre || f.tercero_nit || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{f.fecha || "—"}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(f.total_dian)}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(f.total_siigo)}</td>
                  <td className="px-4 py-2 text-right text-slate-400">{formatCurrency(f.iva_dian)}</td>
                  <td className="px-4 py-2 text-right text-slate-400">{formatCurrency(f.iva_siigo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function EstadoBadge({ tipo }: { tipo: TipoEstado }) {
  const cfg = {
    coincide: { label: "Coincide", cls: "bg-emerald-100 text-emerald-700" },
    falta_en_siigo: { label: "Falta en Siigo", cls: "bg-red-100 text-red-700" },
    monto_distinto: { label: "Monto distinto", cls: "bg-orange-100 text-orange-700" },
    extra_en_siigo: { label: "Extra en Siigo", cls: "bg-slate-100 text-slate-600" },
  }[tipo];
  return (
    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${cfg.cls}`}>{cfg.label}</span>
  );
}

const Pill = ({
  icon,
  label,
  value,
  color,
  activo,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  color: "emerald" | "orange" | "red" | "slate";
  activo: boolean;
  onClick: () => void;
}) => {
  const themesActivo: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-100 border-emerald-300 shadow-sm",
    orange: "text-orange-700 bg-orange-100 border-orange-300 shadow-sm",
    red: "text-red-700 bg-red-100 border-red-300 shadow-sm",
    slate: "text-slate-700 bg-slate-200 border-slate-300 shadow-sm",
  };
  const themesInactivo: Record<string, string> = {
    emerald: "text-slate-400 bg-white border-slate-100",
    orange: "text-slate-400 bg-white border-slate-100",
    red: "text-slate-400 bg-white border-slate-100",
    slate: "text-slate-400 bg-white border-slate-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click para mostrar u ocultar esta categoría en la tabla"
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all active:scale-95 ${
        activo ? themesActivo[color] : themesInactivo[color]
      }`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tight">
        {icon}
        {label}
      </span>
      <span className="text-lg font-black">{value ?? 0}</span>
    </button>
  );
};
