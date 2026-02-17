"use client";
import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Stats {
    ventasHoy: { total: number; pedidos: number };
    ventasTotal: { total: number; pedidos: number };
    porEstado: Array<{ estado: string; cantidad: string }>;
    ventasSemana: Array<{ dia: string; total: number; pedidos: number }>;
    topProductos: Array<{ nombre: string; vendido: number; ingreso: number }>;
    recientes: Array<{
        id_pedido: number; numero_ticket: string; cliente_nombre: string;
        sede_nombre: string; estado: string; total: string; fecha: string;
    }>;
    ventasPorSede: Array<{ sede: string; total: number; pedidos: number }>;
}

const EMPTY_STATS: Stats = {
    ventasHoy: { total: 0, pedidos: 0 },
    ventasTotal: { total: 0, pedidos: 0 },
    porEstado: [],
    ventasSemana: [],
    topProductos: [],
    recientes: [],
    ventasPorSede: [],
};

const toNumber = (value: unknown): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const normalizeStats = (value: unknown): Stats => {
    if (!value || typeof value !== "object") return EMPTY_STATS;
    const raw = value as Partial<Stats>;

    return {
        ventasHoy: {
            total: toNumber(raw.ventasHoy?.total),
            pedidos: toNumber(raw.ventasHoy?.pedidos),
        },
        ventasTotal: {
            total: toNumber(raw.ventasTotal?.total),
            pedidos: toNumber(raw.ventasTotal?.pedidos),
        },
        porEstado: Array.isArray(raw.porEstado)
            ? raw.porEstado.map((row) => ({
                estado: String(row?.estado ?? ""),
                cantidad: String(row?.cantidad ?? "0"),
            }))
            : [],
        ventasSemana: Array.isArray(raw.ventasSemana)
            ? raw.ventasSemana.map((row) => ({
                dia: String(row?.dia ?? ""),
                total: toNumber(row?.total),
                pedidos: toNumber(row?.pedidos),
            }))
            : [],
        topProductos: Array.isArray(raw.topProductos)
            ? raw.topProductos.map((row) => ({
                nombre: String(row?.nombre ?? ""),
                vendido: toNumber(row?.vendido),
                ingreso: toNumber(row?.ingreso),
            }))
            : [],
        recientes: Array.isArray(raw.recientes)
            ? raw.recientes.map((row) => ({
                id_pedido: toNumber(row?.id_pedido),
                numero_ticket: String(row?.numero_ticket ?? ""),
                cliente_nombre: String(row?.cliente_nombre ?? ""),
                sede_nombre: String(row?.sede_nombre ?? ""),
                estado: String(row?.estado ?? ""),
                total: String(row?.total ?? "0"),
                fecha: String(row?.fecha ?? ""),
            }))
            : [],
        ventasPorSede: Array.isArray(raw.ventasPorSede)
            ? raw.ventasPorSede.map((row) => ({
                sede: String(row?.sede ?? ""),
                total: toNumber(row?.total),
                pedidos: toNumber(row?.pedidos),
            }))
            : [],
    };
};

const formatCOP = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

const CHART_COLORS = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#fff7ed", "#ea580c", "#c2410c"];

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>(EMPTY_STATS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard/stats")
            .then(async (r) => {
                if (!r.ok) return EMPTY_STATS;
                const data = await r.json();
                return normalizeStats(data);
            })
            .then((data) => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => {
                setStats(EMPTY_STATS);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 animate-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="loading-skeleton h-32 rounded-2xl" />
                    ))}
                </div>
                <div className="loading-skeleton h-80 rounded-2xl" />
            </div>
        );
    }

    const kpiCards = [
        {
            title: "Ventas Hoy",
            value: formatCOP(stats.ventasHoy.total),
            subtitle: `${stats.ventasHoy.pedidos} pedidos`,
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
            color: "from-primary-500/20 to-primary-600/10",
            iconColor: "text-primary-400",
        },
        {
            title: "Ventas Totales",
            value: formatCOP(stats.ventasTotal.total),
            subtitle: `${stats.ventasTotal.pedidos} pedidos históricos`,
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            ),
            color: "from-emerald-500/20 to-emerald-600/10",
            iconColor: "text-emerald-400",
        },
        {
            title: "Ticket Promedio",
            value: stats.ventasTotal.pedidos > 0
                ? formatCOP(stats.ventasTotal.total / stats.ventasTotal.pedidos)
                : formatCOP(0),
            subtitle: "Valor promedio por pedido",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
            ),
            color: "from-blue-500/20 to-blue-600/10",
            iconColor: "text-blue-400",
        },
        {
            title: "Pedidos Pendientes",
            value: stats.porEstado.find((e) => e.estado === "pendiente")?.cantidad || "0",
            subtitle: "Requieren atención",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            ),
            color: "from-amber-500/20 to-amber-600/10",
            iconColor: "text-amber-400",
        },
    ];

    const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const chartData = stats.ventasSemana.map((d) => {
        const date = new Date(d.dia + "T12:00:00");
        return {
            dia: weekDays[date.getDay()],
            total: d.total,
            pedidos: d.pedidos,
        };
    });

    return (
        <div className="space-y-6">
            {/* Title */}
            <div className="animate-in">
                <h1 className="text-2xl font-bold text-surface-50">Dashboard</h1>
                <p className="text-surface-400 text-sm mt-1">Resumen general de ventas y operaciones</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card, i) => (
                    <div key={i} className="stat-card animate-in" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center ${card.iconColor}`}>
                                {card.icon}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-surface-50">{card.value}</p>
                        <p className="text-sm font-medium text-surface-400 mt-1">{card.title}</p>
                        <p className="text-xs text-surface-500 mt-0.5">{card.subtitle}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 glass-card p-6 animate-in" style={{ animationDelay: "300ms" }}>
                    <h3 className="text-lg font-semibold text-surface-100 mb-1">Ventas Últimos 7 Días</h3>
                    <p className="text-xs text-surface-500 mb-6">Ingresos diarios en COP</p>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                                <XAxis dataKey="dia" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(15,23,42,0.95)",
                                        border: "1px solid rgba(148,163,184,0.1)",
                                        borderRadius: "12px",
                                        padding: "12px 16px",
                                        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                                    }}
                                    labelStyle={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}
                                    itemStyle={{ color: "#94a3b8" }}
                                    formatter={(value: number) => [formatCOP(value), "Ventas"]}
                                />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {chartData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-60 text-surface-500">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-surface-600">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18" />
                                <path d="M9 21V9" />
                            </svg>
                            <p className="text-sm">No hay datos de la última semana</p>
                            <p className="text-xs text-surface-600 mt-1">Los datos aparecerán cuando se registren pedidos</p>
                        </div>
                    )}
                </div>

                {/* Ventas por Sede */}
                <div className="glass-card p-6 animate-in" style={{ animationDelay: "400ms" }}>
                    <h3 className="text-lg font-semibold text-surface-100 mb-1">Ventas por Sede</h3>
                    <p className="text-xs text-surface-500 mb-6">Rendimiento por ubicación</p>
                    <div className="space-y-4">
                        {stats.ventasPorSede.map((sede, i) => (
                            <div key={i} className="glass-card-light p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-surface-200">{sede.sede}</span>
                                    <span className="text-xs text-surface-500">{sede.pedidos} pedidos</span>
                                </div>
                                <p className="text-lg font-bold text-primary-400">{formatCOP(sede.total)}</p>
                                <div className="mt-2 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
                                        style={{
                                            width: `${stats.ventasPorSede.length > 0
                                                ? Math.max(5, (sede.total / Math.max(...stats.ventasPorSede.map((s) => s.total || 1))) * 100)
                                                : 5}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Productos */}
            <div className="glass-card p-6 animate-in" style={{ animationDelay: "500ms" }}>
                <h3 className="text-lg font-semibold text-surface-100 mb-1">Top Productos</h3>
                <p className="text-xs text-surface-500 mb-6">Productos más vendidos</p>
                {stats.topProductos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {stats.topProductos.map((prod, i) => (
                            <div key={i} className="glass-card-light p-4 text-center">
                                <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center text-primary-400 font-bold text-lg mb-3">
                                    {i + 1}
                                </div>
                                <p className="text-sm font-medium text-surface-200 mb-1">{prod.nombre}</p>
                                <p className="text-xs text-surface-500">{prod.vendido} vendidos</p>
                                <p className="text-sm font-bold text-primary-400 mt-1">{formatCOP(prod.ingreso)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-surface-500">
                        <p className="text-sm">Sin datos de productos vendidos aún</p>
                    </div>
                )}
            </div>

            {/* Recent Orders */}
            <div className="glass-card p-6 animate-in" style={{ animationDelay: "600ms" }}>
                <h3 className="text-lg font-semibold text-surface-100 mb-1">Pedidos Recientes</h3>
                <p className="text-xs text-surface-500 mb-6">Últimos 10 pedidos registrados</p>
                {stats.recientes.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-surface-800/50">
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider pb-3 px-4">Ticket</th>
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider pb-3 px-4">Cliente</th>
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider pb-3 px-4">Sede</th>
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider pb-3 px-4">Estado</th>
                                    <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider pb-3 px-4">Total</th>
                                    <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider pb-3 px-4">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-800/30">
                                {stats.recientes.map((p) => (
                                    <tr key={p.id_pedido} className="table-row">
                                        <td className="py-3 px-4 text-sm font-medium text-surface-200">{p.numero_ticket || `#${p.id_pedido}`}</td>
                                        <td className="py-3 px-4 text-sm text-surface-300">{p.cliente_nombre || "—"}</td>
                                        <td className="py-3 px-4 text-sm text-surface-400">{p.sede_nombre || "—"}</td>
                                        <td className="py-3 px-4">
                                            <span className={`badge badge-${p.estado}`}>{p.estado}</span>
                                        </td>
                                        <td className="py-3 px-4 text-sm font-semibold text-surface-200 text-right">{formatCOP(parseFloat(p.total))}</td>
                                        <td className="py-3 px-4 text-sm text-surface-500 text-right">
                                            {new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-surface-500">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-surface-600">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                        </svg>
                        <p className="text-sm">No hay pedidos registrados</p>
                        <p className="text-xs text-surface-600 mt-1">Los pedidos nuevos aparecerán aquí automáticamente</p>
                    </div>
                )}
            </div>
        </div>
    );
}
