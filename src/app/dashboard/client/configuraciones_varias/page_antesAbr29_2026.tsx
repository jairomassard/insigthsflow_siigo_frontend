"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Settings2,
  SlidersHorizontal,
  Wallet,
  Activity,
  Target,
  BarChart3,
  Save,
  Plus,
  Trash2,
  RefreshCcw,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Building2,
} from "lucide-react";

/* =========================================================
 * TIPOS
 * ========================================================= */
type CuentaConfig = {
  codigo: string;
  nombre: string;
};

type CuentaBusqueda = {
  codigo: string;
  nombre: string;
  apariciones?: number;
  ultima_fecha?: string | null;
};

type DashboardResumenConfig = {
  id?: number;
  idcliente?: number;
  activo: boolean;
  mostrar_caja: boolean;
  mostrar_runway: boolean;
  modo_caja: "sin_configurar" | "inclusion" | "exclusion";
  cuentas_incluidas: CuentaConfig[];
  cuentas_excluidas: CuentaConfig[];
  modo_runway:
    | "sin_configurar"
    | "burn_operativo"
    | "egresos_promedio"
    | "personalizado";
  meses_promedio_runway: number;
  meta_eficiencia_operativa: number;
  meta_ebitda: number | null;
  meta_margen_ebitda: number | null;
  meses_grafica: number;
  top_clientes: number;
  top_proveedores: number;
  top_gastos: number;
  indicador_estrella:
    | "eficiencia_operativa"
    | "ebitda"
    | "ventas_netas"
    | "utilidad_operativa"
    | "caja_disponible"
    | "cash_runway";
  modo_periodo_default: "ytd_cerrado" | "manual" | "ultimo_mes_cerrado";
};

type ApiConfigResponse = DashboardResumenConfig;

type SearchResponse = {
  q: string;
  total: number;
  items: CuentaBusqueda[];
};

/* =========================================================
 * HELPERS
 * ========================================================= */
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function numberOrNull(v: string): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

function InfoHint({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex shrink-0">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all hover:bg-slate-200 hover:text-slate-500"
        aria-label="Ver explicación"
      >
        <HelpCircle size={11} />
      </button>

      <div className="pointer-events-none absolute right-0 top-6 z-50 w-[290px] max-w-[290px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[12px] font-medium leading-5 text-slate-700 shadow-xl opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
        {text}
      </div>
    </div>
  );
}

function TitleWithInfo({
  title,
  info,
  className = "",
}: {
  title: string;
  info?: string;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <span>{title}</span>
      {info ? <InfoHint text={info} /> : null}
    </div>
  );
}

const DEFAULT_CONFIG: DashboardResumenConfig = {
  activo: true,
  mostrar_caja: false,
  mostrar_runway: false,
  modo_caja: "sin_configurar",
  cuentas_incluidas: [],
  cuentas_excluidas: [],
  modo_runway: "sin_configurar",
  meses_promedio_runway: 3,
  meta_eficiencia_operativa: 20,
  meta_ebitda: null,
  meta_margen_ebitda: null,
  meses_grafica: 6,
  top_clientes: 5,
  top_proveedores: 5,
  top_gastos: 5,
  indicador_estrella: "eficiencia_operativa",
  modo_periodo_default: "ytd_cerrado",
};

/* =========================================================
 * SUBCOMPONENTES
 * ========================================================= */
function SectionCard({
  icon,
  badge,
  title,
  subtitle,
  info,
  children,
}: {
  icon: React.ReactNode;
  badge: string;
  title: string;
  subtitle: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
      <CardContent className="p-4 lg:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="mb-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {badge}
            </div>
            <TitleWithInfo
              title={title}
              info={info}
              className="text-lg font-black tracking-tight text-slate-900"
            />
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <div className="text-sm font-bold text-slate-800">{label}</div>
        <div className="mt-1 text-sm leading-6 text-slate-500">{description}</div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-1 inline-flex h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-emerald-500" : "bg-slate-300"
        )}
      >
        <span
          className={cx(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function CuentaAutocompleteRow({
  value,
  onChange,
  onDelete,
  placeholderNombre,
}: {
  value: CuentaConfig;
  onChange: (next: CuentaConfig) => void;
  onDelete: () => void;
  placeholderNombre: string;
}) {
  const [query, setQuery] = useState(value.codigo || value.nombre || "");
  const [resultados, setResultados] = useState<CuentaBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 350);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function buscar() {
      const q = debouncedQuery.trim();

      if (q.length < 2) {
        setResultados([]);
        return;
      }

      try {
        setLoading(true);
        const res: SearchResponse = await authFetch(
          `/dashboard/resumen-config/buscar-cuentas?q=${encodeURIComponent(q)}&limite=8`
        );
        setResultados(res?.items || []);
        setOpen(true);
      } catch (e) {
        console.error("Error buscando cuentas", e);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }

    buscar();
  }, [debouncedQuery]);

  function seleccionarCuenta(item: CuentaBusqueda) {
    onChange({
      codigo: item.codigo,
      nombre: item.nombre || "",
    });
    setQuery(item.codigo);
    setOpen(false);
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
      <div className="space-y-1.5 md:col-span-1" ref={wrapperRef}>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Buscar cuenta
        </label>

        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={15} />
          </div>

          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (resultados.length) setOpen(true);
            }}
            placeholder="Ej: 111005 o Davivienda"
            className="h-10 rounded-2xl border-slate-200 pl-9"
          />

          {open && (loading || resultados.length > 0) && (
            <div className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {loading ? (
                <div className="px-3 py-2 text-sm text-slate-500">Buscando...</div>
              ) : (
                <div className="space-y-1">
                  {resultados.map((item, idx) => (
                    <button
                      key={`${item.codigo}-${idx}`}
                      type="button"
                      onClick={() => seleccionarCuenta(item)}
                      className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-600">
                          <Building2 size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800">
                            {item.codigo}
                          </div>
                          <div className="truncate text-sm text-slate-600">
                            {item.nombre || "Sin nombre"}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            Apariciones: {item.apariciones || 0}
                            {item.ultima_fecha ? ` • Último uso: ${item.ultima_fecha}` : ""}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Código cuenta
        </label>
        <Input
          value={value.codigo}
          onChange={(e) => onChange({ ...value, codigo: e.target.value })}
          placeholder="111005"
          className="h-10 rounded-2xl border-slate-200"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nombre
        </label>
        <div className="flex gap-3">
          <Input
            value={value.nombre}
            onChange={(e) => onChange({ ...value, nombre: e.target.value })}
            placeholder={placeholderNombre}
            className="h-10 rounded-2xl border-slate-200"
          />

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <Trash2 size={15} />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
 * PÁGINA
 * ========================================================= */
export default function ConfiguracionesVariasPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [config, setConfig] = useState<DashboardResumenConfig>(DEFAULT_CONFIG);

  async function cargarConfig() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res: ApiConfigResponse = await authFetch("/dashboard/resumen-config");
      setConfig({
        ...DEFAULT_CONFIG,
        ...res,
        cuentas_incluidas: res?.cuentas_incluidas || [],
        cuentas_excluidas: res?.cuentas_excluidas || [],
      });
    } catch (err: any) {
      setError(err?.message || "No fue posible cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }

  async function guardarConfig() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: DashboardResumenConfig = {
        ...config,
        cuentas_incluidas: (config.cuentas_incluidas || []).filter(
          (x) => x.codigo.trim() !== ""
        ),
        cuentas_excluidas: (config.cuentas_excluidas || []).filter(
          (x) => x.codigo.trim() !== ""
        ),
      };

      const res: ApiConfigResponse = await authFetch("/dashboard/resumen-config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setConfig({
        ...DEFAULT_CONFIG,
        ...res,
        cuentas_incluidas: res?.cuentas_incluidas || [],
        cuentas_excluidas: res?.cuentas_excluidas || [],
      });
      setSuccess("Configuración guardada correctamente.");
    } catch (err: any) {
      setError(err?.message || "No fue posible guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    cargarConfig();
  }, []);

  const resumenCaja = useMemo(() => {
    if (config.modo_caja === "inclusion") {
      return `${config.cuentas_incluidas.length} cuenta(s) incluidas`;
    }
    if (config.modo_caja === "exclusion") {
      return `${config.cuentas_excluidas.length} cuenta(s) excluidas`;
    }
    return "Sin parametrización";
  }, [config]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-4 p-3 md:p-4">
        <div className="relative overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.10),_transparent_28%),radial-gradient(circle_at_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(to_bottom_right,_rgba(255,255,255,1),_rgba(248,250,252,0.98))]" />
          <div className="relative flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between lg:p-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Settings2 size={12} />
                Configuraciones varias
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
                Parametrización del Dashboard Ejecutivo
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Aquí defines cómo se comporta el Dashboard Ejecutivo: metas,
                visibilidad de indicadores, fórmula de caja, runway, cantidad de tops
                y otros parámetros. Esta base también servirá para futuras
                configuraciones de otros módulos.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Estado</div>
                <div className="text-sm font-black text-slate-900">
                  {config.activo ? "Activo" : "Inactivo"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Caja</div>
                <div className="text-sm font-black text-slate-900">{resumenCaja}</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium text-slate-500">Runway</div>
                <div className="text-sm font-black text-slate-900">
                  {config.modo_runway}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Card className="rounded-[1.7rem] border border-rose-200 bg-rose-50 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4 text-sm font-medium text-rose-700">
              <AlertTriangle size={18} />
              {error}
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="rounded-[1.7rem] border border-emerald-200 bg-emerald-50 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={18} />
              {success}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cargarConfig}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Recargar
          </button>

          <button
            type="button"
            onClick={guardarConfig}
            disabled={saving || loading}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-lg transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <RefreshCcw size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            icon={<SlidersHorizontal size={18} />}
            badge="General"
            title="Comportamiento general del dashboard"
            subtitle="Parámetros base de activación, período y estructura visual."
            info="Controla si el dashboard está activo, qué periodo toma por defecto y cuántos meses/top mostrar en la vista ejecutiva."
          >
            <div className="space-y-3">
              <ToggleField
                label="Dashboard activo"
                description="Permite habilitar o deshabilitar el uso general del dashboard para este cliente."
                checked={config.activo}
                onChange={(value) => setConfig((prev) => ({ ...prev, activo: value }))}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Período por defecto
                  </label>
                  <select
                    value={config.modo_periodo_default}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        modo_periodo_default:
                          e.target.value as DashboardResumenConfig["modo_periodo_default"],
                      }))
                    }
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="ytd_cerrado">Año corrido cerrado</option>
                    <option value="ultimo_mes_cerrado">Último mes cerrado</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Indicador estrella
                  </label>
                  <select
                    value={config.indicador_estrella}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        indicador_estrella:
                          e.target.value as DashboardResumenConfig["indicador_estrella"],
                      }))
                    }
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="eficiencia_operativa">Eficiencia operativa</option>
                    <option value="ebitda">EBITDA</option>
                    <option value="ventas_netas">Ventas netas</option>
                    <option value="utilidad_operativa">Utilidad operativa</option>
                    <option value="caja_disponible">Caja disponible</option>
                    <option value="cash_runway">Cash runway</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Meses gráfica
                  </label>
                  <Input
                    type="number"
                    min={3}
                    max={24}
                    value={config.meses_grafica}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        meses_grafica: Number(e.target.value || 6),
                      }))
                    }
                    className="h-10 rounded-2xl border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Top clientes
                  </label>
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={config.top_clientes}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        top_clientes: Number(e.target.value || 5),
                      }))
                    }
                    className="h-10 rounded-2xl border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Top proveedores
                  </label>
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={config.top_proveedores}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        top_proveedores: Number(e.target.value || 5),
                      }))
                    }
                    className="h-10 rounded-2xl border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Top gastos
                  </label>
                  <Input
                    type="number"
                    min={3}
                    max={20}
                    value={config.top_gastos}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        top_gastos: Number(e.target.value || 5),
                      }))
                    }
                    className="h-10 rounded-2xl border-slate-200"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Target size={18} />}
            badge="Metas"
            title="Metas y objetivos ejecutivos"
            subtitle="Objetivos que sirven de referencia para el dashboard."
            info="Estas metas alimentan la lectura ejecutiva y permiten comparar el resultado actual contra objetivos definidos por la empresa."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meta eficiencia operativa (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={config.meta_eficiencia_operativa}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      meta_eficiencia_operativa: Number(e.target.value || 0),
                    }))
                  }
                  className="h-10 rounded-2xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meta EBITDA (COP)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={config.meta_ebitda ?? ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      meta_ebitda: numberOrNull(e.target.value),
                    }))
                  }
                  className="h-10 rounded-2xl border-slate-200"
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meta margen EBITDA (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={config.meta_margen_ebitda ?? ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      meta_margen_ebitda: numberOrNull(e.target.value),
                    }))
                  }
                  className="h-10 rounded-2xl border-slate-200"
                  placeholder="Opcional"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            icon={<Wallet size={18} />}
            badge="Caja"
            title="Parametrización de caja disponible"
            subtitle="Define cómo se construye la caja real del negocio."
            info="La caja no debe salir de toda la clase 11 automáticamente. Aquí defines si usarás inclusión explícita de cuentas o exclusión de cuentas."
          >
            <div className="space-y-4">
              <ToggleField
                label="Mostrar caja disponible"
                description="Activa este KPI en el dashboard ejecutivo. Si está apagado, el sistema lo marcará como pendiente."
                checked={config.mostrar_caja}
                onChange={(value) => setConfig((prev) => ({ ...prev, mostrar_caja: value }))}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Modo caja
                </label>
                <select
                  value={config.modo_caja}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      modo_caja: e.target.value as DashboardResumenConfig["modo_caja"],
                    }))
                  }
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                >
                  <option value="sin_configurar">Sin configurar</option>
                  <option value="inclusion">Incluir solo cuentas definidas</option>
                  <option value="exclusion">Excluir cuentas de clase 11</option>
                </select>
              </div>

              {config.modo_caja === "inclusion" && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        Cuentas incluidas
                      </div>
                      <div className="text-sm text-slate-500">
                        Solo estas cuentas se usarán para calcular la caja disponible.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          cuentas_incluidas: [
                            ...(prev.cuentas_incluidas || []),
                            { codigo: "", nombre: "" },
                          ],
                        }))
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Plus size={15} />
                      Agregar cuenta
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(config.cuentas_incluidas || []).map((cuenta, idx) => (
                      <CuentaAutocompleteRow
                        key={`inc-${idx}`}
                        value={cuenta}
                        placeholderNombre="Banco Davivienda Ahorros Ppal"
                        onChange={(next) =>
                          setConfig((prev) => {
                            const arr = [...(prev.cuentas_incluidas || [])];
                            arr[idx] = next;
                            return { ...prev, cuentas_incluidas: arr };
                          })
                        }
                        onDelete={() =>
                          setConfig((prev) => ({
                            ...prev,
                            cuentas_incluidas: (prev.cuentas_incluidas || []).filter(
                              (_, i) => i !== idx
                            ),
                          }))
                        }
                      />
                    ))}

                    {!(config.cuentas_incluidas || []).length && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                        Aún no has agregado cuentas incluidas.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {config.modo_caja === "exclusion" && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        Cuentas excluidas
                      </div>
                      <div className="text-sm text-slate-500">
                        El sistema tomará clase 11, excepto estas cuentas.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          cuentas_excluidas: [
                            ...(prev.cuentas_excluidas || []),
                            { codigo: "", nombre: "" },
                          ],
                        }))
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Plus size={15} />
                      Agregar cuenta
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(config.cuentas_excluidas || []).map((cuenta, idx) => (
                      <CuentaAutocompleteRow
                        key={`exc-${idx}`}
                        value={cuenta}
                        placeholderNombre="Cuenta transitoria / restringida"
                        onChange={(next) =>
                          setConfig((prev) => {
                            const arr = [...(prev.cuentas_excluidas || [])];
                            arr[idx] = next;
                            return { ...prev, cuentas_excluidas: arr };
                          })
                        }
                        onDelete={() =>
                          setConfig((prev) => ({
                            ...prev,
                            cuentas_excluidas: (prev.cuentas_excluidas || []).filter(
                              (_, i) => i !== idx
                            ),
                          }))
                        }
                      />
                    ))}

                    {!(config.cuentas_excluidas || []).length && (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                        Aún no has agregado cuentas excluidas.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<Activity size={18} />}
            badge="Runway"
            title="Parametrización de cash runway"
            subtitle="Define cómo se calcula el runway del dashboard."
            info="El runway depende de una caja válida y de una fórmula coherente de burn o egresos promedio. Aquí defines cómo se medirá."
          >
            <div className="space-y-4">
              <ToggleField
                label="Mostrar cash runway"
                description="Activa este KPI en el dashboard ejecutivo. Si está apagado, el sistema lo marcará como pendiente."
                checked={config.mostrar_runway}
                onChange={(value) => setConfig((prev) => ({ ...prev, mostrar_runway: value }))}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Modo runway
                  </label>
                  <select
                    value={config.modo_runway}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        modo_runway: e.target.value as DashboardResumenConfig["modo_runway"],
                      }))
                    }
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="sin_configurar">Sin configurar</option>
                    <option value="egresos_promedio">Egresos promedio</option>
                    <option value="burn_operativo">Burn operativo</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Meses promedio runway
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={config.meses_promedio_runway}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        meses_promedio_runway: Number(e.target.value || 3),
                      }))
                    }
                    className="h-10 rounded-2xl border-slate-200"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                <span className="font-bold text-slate-800">Recomendación actual:</span>{" "}
                mientras arrancamos, el modo más estable es{" "}
                <span className="font-bold">egresos_promedio</span>, siempre y cuando la caja
                ya esté correctamente parametrizada.
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          icon={<BarChart3 size={18} />}
          badge="Futuro"
          title="Espacio para otras parametrizaciones"
          subtitle="Base para crecer esta página hacia otros módulos del sistema."
          info="Esta sección deja preparado el concepto de 'Configuraciones varias' para que después agreguemos P&L, consolidado, cartera, alertas, exportaciones y otros comportamientos."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Parámetros del P&L",
              "Parámetros del consolidado",
              "Reglas de alertas",
              "Configuración de exportables",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500"
              >
                Próximamente: {item}
              </div>
            ))}
          </div>
        </SectionCard>

        {loading && (
          <Card className="rounded-[1.7rem] border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4 text-sm font-medium text-slate-600">
              <RefreshCcw size={16} className="animate-spin" />
              Cargando configuración...
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}